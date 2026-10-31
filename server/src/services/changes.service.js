// Agent Studio Code: code changes that wait for the user's answer.
//   request()  an agent's own Edit or Write; the agent waits until the user answers
//   suggest()  a suggestion from any specialist; if accepted, the app applies it to the file
import fs from "node:fs/promises";
import path from "node:path";
import { query } from "../db/pool.js";
import AppError from "../utils/AppError.js";
import { publish } from "./events.service.js";

const waiting = new Map();

async function insert(session, agent, mode, change, blocking) {
  const { rows } = await query(
    `INSERT INTO code_changes (session_id, agent_id, mode, file_path, old_text, new_text, reason, blocking)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [session.id, agent.id, mode, change.file, change.oldText, change.newText, change.reason || "", blocking],
  );
  publish(session.id, "change", rows[0]);
  return rows[0];
}

async function setStatus(change, status) {
  const { rows } = await query("UPDATE code_changes SET status = $1, updated_at = now() WHERE id = $2 RETURNING *", [status, change.id]);
  publish(change.session_id, "change", rows[0]);
  return rows[0];
}

// Resolves to { approved, feedback } when the user answers, or when the run is stopped.
export async function request(session, agent, mode, change, signal) {
  const row = await insert(session, agent, mode, change, true);
  const id = String(row.id);
  return new Promise((resolve) => {
    const onStop = async () => {
      waiting.delete(id);
      await setStatus(row, "cancelled");
      resolve({ approved: false, feedback: "The user stopped the run." });
    };
    waiting.set(id, (answer) => {
      signal.removeEventListener("abort", onStop);
      waiting.delete(id);
      resolve(answer);
    });
    signal.addEventListener("abort", onStop, { once: true });
  });
}

function insideFolder(workdir, file) {
  const root = path.resolve(workdir);
  const full = path.resolve(root, file);
  if (full !== root && !full.startsWith(root + path.sep)) throw new AppError(`${file} is outside the project folder`);
  return full;
}

export async function suggest(session, agent, mode, change) {
  insideFolder(session.workdir, change.file);
  return insert(session, agent, mode, change, false);
}

async function applySuggestion(workdir, change) {
  const full = insideFolder(workdir, change.file_path);
  const current = await fs.readFile(full, "utf8").catch(() => null);
  if (!change.old_text) {
    if (current !== null) throw new AppError("That file already exists");
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, change.new_text);
    return;
  }
  if (current === null) throw new AppError("The file no longer exists");
  const parts = current.split(change.old_text);
  if (parts.length !== 2) throw new AppError("The file changed, so this suggestion can no longer be applied exactly");
  await fs.writeFile(full, parts.join(change.new_text));
}

export async function decide(session, id, approved, feedback) {
  const { rows } = await query("SELECT * FROM code_changes WHERE id = $1 AND session_id = $2", [id, session.id]);
  const change = rows[0];
  if (!change) throw new AppError("Change not found", 404);
  if (change.status !== "pending") throw new AppError("This change was already answered", 409);

  if (change.blocking) {
    const answer = waiting.get(String(change.id));
    if (!answer) {
      await setStatus(change, "cancelled");
      throw new AppError("The agent is no longer waiting for this change", 409);
    }
    answer({ approved, feedback });
    return setStatus(change, approved ? "applied" : "rejected");
  }
  if (!approved) return setStatus(change, "rejected");
  try {
    await applySuggestion(session.workdir, change);
  } catch (err) {
    await setStatus(change, "failed");
    throw err;
  }
  return setStatus(change, "applied");
}

export async function list(sessionId) {
  const { rows } = await query("SELECT * FROM code_changes WHERE session_id = $1 ORDER BY id", [sessionId]);
  return rows;
}

// After a restart no agent is waiting any more.
export async function resetWaiting() {
  await query("UPDATE code_changes SET status = 'cancelled' WHERE status = 'pending' AND blocking");
}
