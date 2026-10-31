import pool, { query } from "../db/pool.js";
import AppError from "../utils/AppError.js";
import { slugify } from "../utils/slug.js";

const SELECT = `
  SELECT a.*, COALESCE(array_agg(s.skill_id ORDER BY s.skill_id) FILTER (WHERE s.skill_id IS NOT NULL), '{}') AS skill_ids
  FROM agents a LEFT JOIN agent_skills s ON s.agent_id = a.id`;

export async function list() {
  const { rows } = await query(`${SELECT} GROUP BY a.id ORDER BY a.kind, a.name`);
  return rows;
}

export async function get(id) {
  const { rows } = await query(`${SELECT} WHERE a.id = $1 GROUP BY a.id`, [id]);
  if (!rows[0]) throw new AppError("Agent not found", 404);
  return rows[0];
}

export async function getMany(ids) {
  if (!ids.length) return [];
  const { rows } = await query(`${SELECT} WHERE a.id = ANY($1) GROUP BY a.id`, [ids]);
  return ids.map((id) => rows.find((r) => r.id === id)).filter(Boolean);
}

// Assistants only have one mode, and only agents that may edit files can develop.
function checkMode({ kind, mode, tools }) {
  if (kind === "T" && mode !== "assistant") throw new AppError("Assistant (T) agents are always in assistant mode");
  if (kind === "S" && mode === "assistant") throw new AppError("Specialists use developer, tester, observer or consultant mode");
  if (mode === "developer" && tools !== "write") throw new AppError("To develop, the agent needs read-and-write tools");
}

export async function create(data) {
  const slug = slugify(data.slug || `${data.kind}-${data.name}`);
  if (!slug) throw new AppError("Name must contain letters or numbers");
  const mode = data.mode || (data.kind === "T" ? "assistant" : "consultant");
  checkMode({ kind: data.kind, mode, tools: data.tools });
  const { rows } = await query(
    `INSERT INTO agents (slug, name, kind, description, instructions, model, tools, enabled, mode)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
    [slug, data.name, data.kind, data.description, data.instructions, data.model || null, data.tools, data.enabled, mode],
  );
  if (data.skillIds) await setSkills(rows[0].id, data.skillIds);
  return get(rows[0].id);
}

export async function update(id, data) {
  const current = await get(id);
  checkMode({ ...current, ...data, kind: current.kind });
  const fields = ["name", "description", "instructions", "model", "tools", "enabled", "mode"];
  const sets = [];
  const values = [];
  // Fewer rules for the user to remember: only one agent develops at a time.
  if (data.mode === "developer" || (data.enabled && current.mode === "developer")) {
    await query("UPDATE agents SET mode = 'consultant', updated_at = now() WHERE mode = 'developer' AND enabled AND id <> $1", [id]);
  }
  for (const f of fields) {
    if (data[f] === undefined) continue;
    values.push(f === "model" ? data[f] || null : data[f]);
    sets.push(`${f} = $${values.length}`);
  }
  if (sets.length) {
    values.push(id);
    await query(`UPDATE agents SET ${sets.join(", ")}, updated_at = now() WHERE id = $${values.length}`, values);
  }
  if (data.skillIds) await setSkills(id, data.skillIds);
  return get(id);
}

export async function remove(id) {
  const { rowCount } = await query("DELETE FROM agents WHERE id = $1", [id]);
  if (!rowCount) throw new AppError("Agent not found", 404);
}

export async function setSkills(agentId, skillIds) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM agent_skills WHERE agent_id = $1", [agentId]);
    for (const skillId of new Set(skillIds)) {
      await client.query("INSERT INTO agent_skills (agent_id, skill_id) VALUES ($1, $2)", [agentId, skillId]);
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function skillsOf(agentId) {
  const { rows } = await query(
    "SELECT s.* FROM skills s JOIN agent_skills a ON a.skill_id = s.id WHERE a.agent_id = $1 ORDER BY s.name",
    [agentId],
  );
  return rows;
}
