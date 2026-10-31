// Skill library. Each skill is a folder under data/skills/<slug>/ with a SKILL.md at its root;
// the database only keeps the name, description and where it came from.
import fs from "node:fs/promises";
import path from "node:path";
import config from "../config/index.js";
import { query } from "../db/pool.js";
import AppError from "../utils/AppError.js";
import { slugify } from "../utils/slug.js";

const MAX_FILES = 100;
const MAX_BYTES = 5 * 1024 * 1024;

export function parseFrontmatter(md) {
  const match = md.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const out = {};
  if (!match) return out;
  for (const line of match[1].split(/\r?\n/)) {
    const m = line.match(/^(\w[\w-]*):\s*(.*)$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
  }
  return out;
}

function dirOf(slug) {
  return path.join(config.skillsDir, slug);
}

async function listFiles(dir, base = dir) {
  const out = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await listFiles(full, base)));
    else out.push({ path: path.relative(base, full).replaceAll("\\", "/"), size: (await fs.stat(full)).size });
  }
  return out;
}

export async function list() {
  const { rows } = await query("SELECT * FROM skills ORDER BY name");
  return rows;
}

export async function get(id) {
  const { rows } = await query("SELECT * FROM skills WHERE id = $1", [id]);
  if (!rows[0]) throw new AppError("Skill not found", 404);
  const dir = dirOf(rows[0].slug);
  const content = await fs.readFile(path.join(dir, "SKILL.md"), "utf8").catch(() => "");
  const files = await listFiles(dir).catch(() => []);
  return { ...rows[0], content, files };
}

async function save(slug, meta, source) {
  const { rows } = await query(
    `INSERT INTO skills (slug, name, description, source) VALUES ($1, $2, $3, $4)
     ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, source = EXCLUDED.source
     RETURNING id`,
    [slug, meta.name || slug, meta.description || "", source],
  );
  return get(rows[0].id);
}

// SKILL.md must name the skill the same as its folder, so the name is rewritten to the slug.
function withName(content, slug) {
  if (/^---\r?\n[\s\S]*?^name:.*$/m.test(content)) return content.replace(/^name:.*$/m, `name: ${slug}`);
  if (content.startsWith("---")) return content.replace(/^---\r?\n/, `---\nname: ${slug}\n`);
  return `---\nname: ${slug}\ndescription: \n---\n\n${content}`;
}

export async function createManual({ name, content }) {
  const meta = parseFrontmatter(content);
  const slug = slugify(name || meta.name || "");
  if (!slug) throw new AppError("Give the skill a name");
  const dir = dirOf(slug);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, "SKILL.md"), withName(content, slug));
  return save(slug, { ...meta, name: name || meta.name }, "manual");
}

export async function updateContent(id, content) {
  const skill = await get(id);
  await fs.writeFile(path.join(dirOf(skill.slug), "SKILL.md"), withName(content, skill.slug));
  const meta = parseFrontmatter(content);
  await query("UPDATE skills SET description = $1 WHERE id = $2", [meta.description || "", id]);
  return get(id);
}

export async function remove(id) {
  const { rows } = await query("DELETE FROM skills WHERE id = $1 RETURNING slug", [id]);
  if (!rows[0]) throw new AppError("Skill not found", 404);
  await fs.rm(dirOf(rows[0].slug), { recursive: true, force: true });
}

// ---- GitHub import ----

// Accepts https://github.com/owner/repo/tree/<ref>/<path> or a link to the SKILL.md itself.
function parseGithubUrl(raw) {
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new AppError("That is not a valid link");
  }
  if (url.hostname !== "github.com") throw new AppError("Only github.com links are supported");
  const [owner, repo, kind, ref, ...rest] = url.pathname.split("/").filter(Boolean);
  if (!owner || !repo) throw new AppError("The link must point to a GitHub repository folder");
  let dir = rest.join("/");
  if (kind === "blob") dir = rest.slice(0, -1).join("/");
  return { owner, repo: repo.replace(/\.git$/, ""), ref: kind ? ref : undefined, dir };
}

async function github(url) {
  const headers = { "User-Agent": "agent-studio", Accept: "application/vnd.github+json" };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const res = await fetch(url, { headers });
  if (res.status === 403) throw new AppError("GitHub rate limit reached. Try again later or set GITHUB_TOKEN in .env");
  if (!res.ok) throw new AppError(`GitHub answered ${res.status} for ${url}`);
  return res.json();
}

async function remoteFiles({ owner, repo, ref, dir }) {
  const files = [];
  async function walk(p) {
    const qs = ref ? `?ref=${encodeURIComponent(ref)}` : "";
    const items = await github(`https://api.github.com/repos/${owner}/${repo}/contents/${p}${qs}`);
    if (!Array.isArray(items)) throw new AppError("The link points to a file, not a skill folder");
    if (p === dir && !items.some((i) => i.type === "file" && i.name === "SKILL.md")) {
      throw new AppError("No SKILL.md at the root of that folder. Link to one skill's folder.");
    }
    for (const item of items) {
      if (item.type === "dir") await walk(item.path);
      else if (item.type === "file") files.push({ path: dir ? item.path.slice(dir.length + 1) : item.path, size: item.size, url: item.download_url });
      if (files.length > MAX_FILES) throw new AppError(`The folder has more than ${MAX_FILES} files`);
    }
  }
  await walk(dir);
  const total = files.reduce((n, f) => n + f.size, 0);
  if (total > MAX_BYTES) throw new AppError("The folder is larger than 5 MB");
  if (!files.some((f) => f.path === "SKILL.md")) throw new AppError("No SKILL.md at the root of that folder");
  return files;
}

async function download(url) {
  const res = await fetch(url, { headers: { "User-Agent": "agent-studio" } });
  if (!res.ok) throw new AppError(`Could not download ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

// Returns what would be installed so the user can read it before importing.
export async function previewGithub(link) {
  const target = parseGithubUrl(link);
  const files = await remoteFiles(target);
  const content = (await download(files.find((f) => f.path === "SKILL.md").url)).toString("utf8");
  const meta = parseFrontmatter(content);
  return {
    name: meta.name || path.basename(target.dir) || target.repo,
    description: meta.description || "",
    content,
    files: files.map(({ path: p, size }) => ({ path: p, size, script: !/\.(md|txt)$/i.test(p) })),
  };
}

export async function importGithub(link, name) {
  const target = parseGithubUrl(link);
  const files = await remoteFiles(target);
  const firstMd = (await download(files.find((f) => f.path === "SKILL.md").url)).toString("utf8");
  const meta = parseFrontmatter(firstMd);
  const slug = slugify(name || meta.name || path.basename(target.dir) || target.repo);
  const dir = dirOf(slug);
  const staging = `${dir}.importing`;
  await fs.rm(staging, { recursive: true, force: true });
  for (const file of files) {
    const dest = path.resolve(staging, file.path);
    if (!dest.startsWith(path.resolve(staging) + path.sep)) throw new AppError(`Unsafe file path: ${file.path}`);
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.writeFile(dest, file.path === "SKILL.md" ? withName(firstMd, slug) : await download(file.url));
  }
  await fs.rm(dir, { recursive: true, force: true });
  await fs.rename(staging, dir);
  return save(slug, meta, link);
}
