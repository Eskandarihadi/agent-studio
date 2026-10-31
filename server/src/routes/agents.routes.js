import { Router } from "express";
import { z } from "zod";
import * as controller from "../controllers/agents.controller.js";
import { validate } from "../middlewares/validate.js";

const fields = {
  name: z.string().trim().min(1).max(80),
  description: z.string().max(2000),
  instructions: z.string().max(20000),
  model: z.string().max(80).nullable(),
  tools: z.enum(["none", "read", "write"]),
  enabled: z.boolean(),
  mode: z.enum(["developer", "tester", "observer", "consultant", "assistant"]),
  skillIds: z.array(z.number().int()),
};

const createSchema = z.object({
  ...fields,
  kind: z.enum(["S", "T"]),
  description: fields.description.default(""),
  instructions: fields.instructions.default(""),
  model: fields.model.optional(),
  tools: fields.tools.default("read"),
  enabled: fields.enabled.default(true),
  mode: fields.mode.optional(),
  skillIds: fields.skillIds.optional(),
});

const updateSchema = z.object(fields).partial();

const router = Router();
router.get("/", controller.list);
router.post("/", validate(createSchema), controller.create);
router.get("/:id", controller.get);
router.patch("/:id", validate(updateSchema), controller.update);
router.delete("/:id", controller.remove);

export default router;
