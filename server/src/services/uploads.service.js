// Files attached to a message: images, documents or anything else. They are saved under
// data/uploads/<session id>/ and the agents get their paths, so they open them with the Read tool.
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import config from "../config/index.js";
import AppError from "../utils/AppError.js";

export const MAX_FILE_BYTES = 25 * 1024 * 1024;
export const MAX_FILES = 10;

function dirOf(sessionId) {
  return path.join(config.uploadsDir, String(sessionId));
}

// Keeps letters of any language, digits, dots, dashes and underscores; the rest becomes "_".
function safeName(name) {
  const base = path.basename(String(name || "file")).replace(/[^\p{L}\p{N}._-]+/gu, "_").slice(-120);
  return base.replace(/^\.+/, "") || "file";
}

export async function save(sessionId, name, buffer) {
  if (!buffer?.length) throw new AppError("The file is empty");
  if (buffer.length > MAX_FILE_BYTES) throw new AppError("Each file can be at most 25 MB");
  const dir = dirOf(sessionId);
  await fs.mkdir(dir, { recursive: true });
  const clean = safeName(name);
  const file = path.join(dir, `${randomUUID().slice(0, 8)}-${clean}`);
  await fs.writeFile(file, buffer);
  return { path: file, name: clean, size: buffer.length };
}

// Only files that were uploaded to this session are accepted in a message.
export async function check(sessionId, files) {
  if (files.length > MAX_FILES) throw new AppError(`At most ${MAX_FILES} files per message`);
  const dir = path.resolve(dirOf(sessionId));
  for (const f of files) {
    const full = path.resolve(f.path);
    if (!full.startsWith(dir + path.sep)) throw new AppError(`Unknown file: ${f.name}`);
    if (!(await fs.stat(full).catch(() => null))) throw new AppError(`File not found: ${f.name}`);
  }
  return files;
}

// The part of the prompt that tells the agents about the attachments.
export function describe(files) {
  if (!files.length) return "";
  const lines = files.map((f) => `- ${f.name}: ${path.resolve(f.path)}`);
  return `\n\nThe user attached ${files.length === 1 ? "this file" : "these files"}. Open each with the Read tool (it reads images and PDFs too) before you answer:\n${lines.join("\n")}`;
}

export async function removeAll(sessionId) {
  await fs.rm(dirOf(sessionId), { recursive: true, force: true });
}
