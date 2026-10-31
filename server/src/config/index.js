import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const dataDir = path.resolve(root, process.env.DATA_DIR || "data");

export default {
  port: Number(process.env.PORT || 4100),
  databaseUrl: process.env.DATABASE_URL,
  defaultWorkdir: process.env.DEFAULT_WORKDIR || root,
  dataDir,
  skillsDir: path.join(dataDir, "skills"),
  pluginsDir: path.join(dataDir, "agent-plugins"),
  uploadsDir: path.join(dataDir, "uploads"),
};
