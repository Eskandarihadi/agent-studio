import * as changes from "../services/changes.service.js";
import * as sessions from "../services/sessions.service.js";
import * as orchestrator from "../services/orchestrator.service.js";
import { subscribe } from "../services/events.service.js";
import * as uploads from "../services/uploads.service.js";

export async function list(req, res) {
  res.json(await sessions.list());
}

export async function get(req, res) {
  const id = Number(req.params.id);
  res.json({ session: await sessions.get(id), messages: await sessions.messages(id), changes: await changes.list(id) });
}

export async function create(req, res) {
  res.status(201).json(await sessions.create(req.body));
}

export async function openRoom(req, res) {
  res.json(await sessions.openRoom(req.body.workdir, req.body.fresh));
}

export async function folders(req, res) {
  res.json(await sessions.folders());
}

export async function remove(req, res) {
  const id = Number(req.params.id);
  orchestrator.stop(id);
  await sessions.remove(id);
  await uploads.removeAll(id);
  res.status(204).end();
}

// The page sends each attached file on its own, as the raw request body, with its name in ?name=.
export async function upload(req, res) {
  const id = Number(req.params.id);
  await sessions.get(id);
  res.status(201).json(await uploads.save(id, req.query.name, req.body));
}

export async function events(req, res) {
  const id = Number(req.params.id);
  await sessions.get(id);
  subscribe(id, res);
}

// The agents' work runs in the background; the page follows it through /events.
export async function send(req, res) {
  const id = Number(req.params.id);
  await orchestrator.userMessage(id, req.body.text, await uploads.check(id, req.body.files), req.body.codeMode);
  res.status(202).json({ ok: true });
}

export async function approve(req, res) {
  await orchestrator.approve(Number(req.params.id), req.body.note, req.body.codeMode);
  res.status(202).json({ ok: true });
}

export async function revise(req, res) {
  const id = Number(req.params.id);
  await orchestrator.revise(id, req.body.text, await uploads.check(id, req.body.files));
  res.status(202).json({ ok: true });
}

export async function converge(req, res) {
  await orchestrator.converge(Number(req.params.id), req.body.messageIds);
  res.status(202).json({ ok: true });
}

export async function decideChange(req, res) {
  const session = await sessions.get(Number(req.params.id));
  res.json(await changes.decide(session, Number(req.params.changeId), req.body.approved, req.body.feedback));
}

export async function stop(req, res) {
  orchestrator.stop(Number(req.params.id));
  res.json({ ok: true });
}
