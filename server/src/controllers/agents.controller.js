import * as agents from "../services/agents.service.js";

export async function list(req, res) {
  res.json(await agents.list());
}

export async function get(req, res) {
  res.json(await agents.get(Number(req.params.id)));
}

export async function create(req, res) {
  res.status(201).json(await agents.create(req.body));
}

export async function update(req, res) {
  res.json(await agents.update(Number(req.params.id), req.body));
}

export async function remove(req, res) {
  await agents.remove(Number(req.params.id));
  res.status(204).end();
}
