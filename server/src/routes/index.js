import { Router } from "express";
import config from "../config/index.js";
import agents from "./agents.routes.js";
import sessions from "./sessions.routes.js";
import skills from "./skills.routes.js";

const router = Router();
router.get("/health", (req, res) => res.json({ ok: true, defaultWorkdir: config.defaultWorkdir }));
router.use("/agents", agents);
router.use("/skills", skills);
router.use("/sessions", sessions);

export default router;
