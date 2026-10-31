import { Router } from "express";
import { z } from "zod";
import * as controller from "../controllers/skills.controller.js";
import { validate } from "../middlewares/validate.js";

const content = z.string().min(1).max(200000);
const github = z.object({ url: z.string().url(), name: z.string().max(60).optional() });

const router = Router();
router.get("/", controller.list);
router.post("/", validate(z.object({ name: z.string().max(60).optional(), content })), controller.create);
router.post("/github/preview", validate(github), controller.preview);
router.post("/github/import", validate(github), controller.importFromGithub);
router.get("/:id", controller.get);
router.put("/:id", validate(z.object({ content })), controller.update);
router.delete("/:id", controller.remove);

export default router;
