import pg from "pg";
import config from "../config/index.js";

if (!config.databaseUrl) {
  throw new Error("DATABASE_URL is missing. Copy .env.example to .env and fill it in.");
}

const pool = new pg.Pool({ connectionString: config.databaseUrl });

export function query(text, params) {
  return pool.query(text, params);
}

export default pool;
