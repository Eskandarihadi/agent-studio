import express, { Router } from "express";
import { z } from "zod";
import config from "../config/index.js";
import * as controller from "../controllers/sessions.controller.js";
import { validate } from "../middlewares/validate.js";
import { MAX_FILES, MAX_FILE_BYTES } from "../services/uploads.service.js";

const createSchema = z.object({
  title: z.string().trim().min(1).max(120),
  type: z.enum(["develop", "test", "observe", "consult", "assist"]),
  workdir: z.string().trim().min(1).default(config.defaultWorkdir),
  leadAgentId: z.number().int().nullable().optional(),
  memberIds: z.array(z.number().int()).default([]),
  style: z.enum(["panel", "lead"]).default("panel"),
});

const files = z.array(z.object({ path: z.string().min(1), name: z.string().min(1).max(200) })).max(MAX_FILES).default([]);
const text = z.object({ text: z.string().trim().min(1).max(50000), files, codeMode: z.boolean().default(false) });

const router = Router();
router.get("/", controller.list);
router.post("/", validate(createSchema), controller.create);
router.get("/folders", controller.folders);
router.post("/room", validate(z.object({ workdir: z.string().trim().min(1), fresh: z.boolean().default(false) })), controller.openRoom);
router.get("/:id", controller.get);
router.delete("/:id", controller.remove);
router.get("/:id/events", controller.events);
router.post("/:id/files", express.raw({ type: () => true, limit: MAX_FILE_BYTES }), controller.upload);
router.post("/:id/messages", validate(text), controller.send);
router.post("/:id/approve", validate(z.object({ note: z.string().max(20000).optional(), codeMode: z.boolean().default(false) })), controller.approve);
router.post("/:id/revise", validate(text), controller.revise);
router.post("/:id/stop", controller.stop);
router.post("/:id/converge", validate(z.object({ messageIds: z.array(z.number().int()).min(2).max(30) })), controller.converge);
router.post("/:id/changes/:changeId", validate(z.object({ approved: z.boolean(), feedback: z.string().max(5000).optional() })), controller.decideChange);

export default router;
