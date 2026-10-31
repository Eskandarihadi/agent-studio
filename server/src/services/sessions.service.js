import fs from "node:fs/promises";
import { query } from "../db/pool.js";
import AppError from "../utils/AppError.js";
import * as agents from "./agents.service.js";
import { publish } from "./events.service.js";

export async function list() {
  const { rows } = await query("SELECT * FROM sessions ORDER BY updated_at DESC");
  return rows;
}

export async function get(id) {
  const { rows } = await query("SELECT * FROM sessions WHERE id = $1", [id]);
  if (!rows[0]) throw new AppError("Session not found", 404);
  return rows[0];
}

// Which agents each session type needs, and in which role.
async function checkMembers({ type, leadAgentId, memberIds, style }) {
  const lead = leadAgentId ? await agents.get(leadAgentId) : null;
  const members = await agents.getMany(memberIds);
  for (const a of [lead, ...members].filter(Boolean)) {
    if (!a.enabled) throw new AppError(`${a.name} is turned off`);
  }
  if (memberIds.includes(leadAgentId)) throw new AppError("The lead agent cannot also be an observer");
  if (type === "assist") {
    if (lead?.kind !== "T") throw new AppError("Pick an assistant (T) agent");
  } else if (type === "develop" || type === "test") {
    if (lead?.kind !== "S") throw new AppError("Pick a specialist (S) agent to lead");
    if (type === "develop" && lead.tools !== "write") throw new AppError(`${lead.name} is not allowed to edit files (tools: ${lead.tools})`);
  } else if (type === "observe") {
    if (!members.length) throw new AppError("Pick at least one observer");
  } else if (type === "consult") {
    if (style === "lead" && lead?.kind !== "S") throw new AppError("Pick the specialist you want to consult");
    if (style === "panel" && !members.length) throw new AppError("Pick at least one consultant");
  }
  if (members.some((m) => m.kind !== "S")) throw new AppError("Only specialist (S) agents can observe or consult");
}

export async function create(data) {
  await checkFolder(data.workdir);
  await checkMembers(data);
  const { rows } = await query(
    `INSERT INTO sessions (title, type, workdir, lead_agent_id, member_ids, style)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [data.title, data.type, data.workdir, data.leadAgentId || null, data.memberIds, data.style],
  );
  return rows[0];
}

// ---- Control room ----

const NEW_ROOM = "New conversation";

async function checkFolder(workdir) {
  const stat = await fs.stat(workdir).catch(() => null);
  if (!stat?.isDirectory()) throw new AppError(`Folder not found: ${workdir}`);
}

// The latest conversation for this folder, or a new one. fresh starts a new one anyway.
export async function openRoom(workdir, fresh = false) {
  await checkFolder(workdir);
  if (!fresh) {
    const { rows } = await query("SELECT * FROM sessions WHERE type = 'room' AND workdir = $1 ORDER BY updated_at DESC LIMIT 1", [workdir]);
    if (rows[0]) return rows[0];
  }
  const { rows } = await query("INSERT INTO sessions (title, type, workdir) VALUES ($1, 'room', $2) RETURNING *", [NEW_ROOM, workdir]);
  return rows[0];
}

// A conversation is named after its first message.
export async function retitle(id, text) {
  const title = text.replace(/\s+/g, " ").trim().slice(0, 80);
  await query("UPDATE sessions SET title = $1 WHERE id = $2 AND title = $3", [title, id, NEW_ROOM]);
}

export async function folders() {
  const { rows } = await query("SELECT workdir FROM sessions GROUP BY workdir ORDER BY max(updated_at) DESC LIMIT 20");
  return rows.map((r) => r.workdir);
}

export async function remove(id) {
  const { rowCount } = await query("DELETE FROM sessions WHERE id = $1", [id]);
  if (!rowCount) throw new AppError("Session not found", 404);
}

export async function messages(sessionId) {
  const { rows } = await query("SELECT * FROM messages WHERE session_id = $1 ORDER BY id", [sessionId]);
  return rows;
}

export async function addMessage(sessionId, { author, agentId = null, mode = null, kind = "text", content, meta = {} }) {
  const { rows } = await query(
    `INSERT INTO messages (session_id, author, agent_id, mode, kind, content, meta)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [sessionId, author, agentId, mode, kind, content, meta],
  );
  await query("UPDATE sessions SET updated_at = now() WHERE id = $1", [sessionId]);
  publish(sessionId, "message", rows[0]);
  return rows[0];
}

export async function setStatus(sessionId, status, pending = null) {
  const { rows } = await query(
    "UPDATE sessions SET status = $1, pending = $2, updated_at = now() WHERE id = $3 RETURNING *",
    [status, pending, sessionId],
  );
  publish(sessionId, "session", rows[0]);
  return rows[0];
}

export async function setCodeMode(sessionId, on) {
  await query("UPDATE sessions SET code_mode = $1 WHERE id = $2", [on, sessionId]);
}

export async function saveSdkSession(sessionId, key, sdkSessionId) {
  await query("UPDATE sessions SET sdk_sessions = sdk_sessions || jsonb_build_object($1::text, $2::text) WHERE id = $3", [
    key,
    sdkSessionId,
    sessionId,
  ]);
}

// After a restart nothing is running any more.
export async function resetRunning() {
  await query("UPDATE sessions SET status = 'idle' WHERE status = 'running'");
}
