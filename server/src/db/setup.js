// Creates the database if needed, applies migrations in order, and seeds example agents.
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import config from "../config/index.js";
import { agents } from "./seed.js";

const migrationsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "migrations");

async function ensureDatabase() {
  const url = new URL(config.databaseUrl);
  const name = decodeURIComponent(url.pathname.slice(1));
  url.pathname = "/postgres";
  const admin = new pg.Client({ connectionString: url.toString() });
  await admin.connect();
  const found = await admin.query("SELECT 1 FROM pg_database WHERE datname = $1", [name]);
  if (!found.rowCount) {
    await admin.query(`CREATE DATABASE "${name.replaceAll('"', "")}"`);
    console.log(`Created database ${name}`);
  }
  await admin.end();
}

async function migrate(client) {
  await client.query("CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ DEFAULT now())");
  const done = new Set((await client.query("SELECT name FROM schema_migrations")).rows.map((r) => r.name));
  const files = (await fs.readdir(migrationsDir)).filter((f) => f.endsWith(".sql")).sort();
  for (const file of files) {
    if (done.has(file)) continue;
    const sql = await fs.readFile(path.join(migrationsDir, file), "utf8");
    await client.query("BEGIN");
    await client.query(sql);
    await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [file]);
    await client.query("COMMIT");
    console.log(`Applied ${file}`);
  }
}

async function seed(client) {
  const { rows } = await client.query("SELECT count(*)::int AS n FROM agents");
  if (rows[0].n) return;
  for (const a of agents) {
    await client.query(
      "INSERT INTO agents (slug, name, kind, tools, description, instructions, mode) VALUES ($1, $2, $3, $4, $5, $6, $7)",
      [a.slug, a.name, a.kind, a.tools, a.description, a.instructions, a.kind === "T" ? "assistant" : "consultant"],
    );
  }
  console.log(`Seeded ${agents.length} example agents`);
}

if (!config.databaseUrl) {
  console.error("DATABASE_URL is missing. Copy .env.example to .env and fill it in.");
  process.exit(1);
}

await ensureDatabase();
const client = new pg.Client({ connectionString: config.databaseUrl });
await client.connect();
try {
  await migrate(client);
  await seed(client);
  console.log("Database ready.");
} finally {
  await client.end();
}
