// Gives an agent its skills: copies the assigned skill folders into a small local plugin
// that only this run of the agent loads. Each run gets its own copy so parallel runs do not clash.
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import config from "../config/index.js";

export async function buildPlugin(agent, skills) {
  if (!skills.length) return { plugins: [], skills: [], cleanup: async () => {} };
  const name = `agent-${agent.slug}`;
  const dir = path.join(config.pluginsDir, `${agent.slug}-${randomUUID().slice(0, 8)}`);
  await fs.mkdir(path.join(dir, ".claude-plugin"), { recursive: true });
  await fs.writeFile(
    path.join(dir, ".claude-plugin", "plugin.json"),
    JSON.stringify({ name, version: "1.0.0", description: `Skills for ${agent.name}` }, null, 2),
  );
  for (const skill of skills) {
    await fs.cp(path.join(config.skillsDir, skill.slug), path.join(dir, "skills", skill.slug), { recursive: true });
  }
  return {
    plugins: [{ type: "local", path: dir }],
    skills: skills.map((s) => `${name}:${s.slug}`),
    cleanup: () => fs.rm(dir, { recursive: true, force: true }),
  };
}
