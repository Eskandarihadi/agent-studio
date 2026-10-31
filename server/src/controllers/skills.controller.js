import * as skills from "../services/skills.service.js";

export async function list(req, res) {
  res.json(await skills.list());
}

export async function get(req, res) {
  res.json(await skills.get(Number(req.params.id)));
}

export async function create(req, res) {
  res.status(201).json(await skills.createManual(req.body));
}

export async function update(req, res) {
  res.json(await skills.updateContent(Number(req.params.id), req.body.content));
}

export async function remove(req, res) {
  await skills.remove(Number(req.params.id));
  res.status(204).end();
}

export async function preview(req, res) {
  res.json(await skills.previewGithub(req.body.url));
}

export async function importFromGithub(req, res) {
  res.status(201).json(await skills.importGithub(req.body.url, req.body.name));
}
