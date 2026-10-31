import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);
const MAX_DIFF = 60000;

async function git(cwd, args) {
  const { stdout } = await run("git", args, { cwd, maxBuffer: 20 * 1024 * 1024 });
  return stdout;
}

// Uncommitted changes in a folder, as text an observer agent can read.
export async function changes(cwd) {
  try {
    await git(cwd, ["rev-parse", "--is-inside-work-tree"]);
  } catch {
    return "The folder is not a git repository, so there is no diff. Read the files that were mentioned instead.";
  }
  const status = await git(cwd, ["status", "--porcelain"]);
  if (!status.trim()) return "There are no uncommitted changes in the folder.";
  const diff = await git(cwd, ["diff", "HEAD"]).catch(() => git(cwd, ["diff"]));
  const cut = diff.length > MAX_DIFF ? `${diff.slice(0, MAX_DIFF)}\n... (diff cut at ${MAX_DIFF} characters)` : diff;
  return `Changed files (git status):\n${status}\nDiff:\n\`\`\`diff\n${cut}\n\`\`\``;
}
