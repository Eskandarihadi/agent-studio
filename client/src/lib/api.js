async function request(method, url, body) {
  const res = await fetch(`/api${url}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export const api = {
  get: (url) => request("GET", url),
  post: (url, body = {}) => request("POST", url, body),
  patch: (url, body) => request("PATCH", url, body),
  put: (url, body) => request("PUT", url, body),
  del: (url) => request("DELETE", url),
};

// Sends one attachment as the raw body. octet-stream keeps the server's JSON parser away from .json files.
export async function uploadFile(sessionId, file) {
  const res = await fetch(`/api/sessions/${sessionId}/files?name=${encodeURIComponent(file.name)}`, {
    method: "POST",
    headers: { "Content-Type": "application/octet-stream" },
    body: file,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Upload failed (${res.status})`);
  return data;
}

export const SPECIALIST_MODES = ["developer", "tester", "observer", "consultant"];

export const MODE_COLOR = {
  developer: "primary",
  tester: "warning",
  observer: "info",
  consultant: "success",
  assistant: "secondary",
};

export const MODE_ICON = {
  developer: "bi-hammer",
  tester: "bi-bug",
  observer: "bi-eye",
  consultant: "bi-chat-square-quote",
  assistant: "bi-lightning",
};

export const TYPE_ICON = {
  room: "bi-grid-1x2",
  develop: "bi-hammer",
  test: "bi-bug",
  observe: "bi-eye",
  consult: "bi-chat-square-quote",
  assist: "bi-lightning",
};

// Same order of rules as the server's control room (orchestrator.service.js), so the page can
// say ahead of time who will act. Returns a list of [key, vars] for the translator.
export function previewFlow(agents, text) {
  const on = agents.filter((a) => a.enabled);
  const names = (mode) => on.filter((a) => a.kind === "S" && a.mode === mode).map((a) => a.name);
  const lower = text.toLowerCase();
  const tags = on.flatMap((a) => [a.name, a.slug].map((n) => ({ a, tag: `@${n.toLowerCase()}` }))).sort((x, y) => y.tag.length - x.tag.length);
  const hit = tags.find(({ tag }) => lower.startsWith(tag) && /\s/.test(lower[tag.length] || ""));
  const observers = names("observer");

  if (hit?.a.kind === "T") return [["flow.assist", { name: hit.a.name }]];
  if (hit) {
    const others = observers.filter((n) => n !== hit.a.name);
    return [["flow.mention", { name: hit.a.name }], ...(others.length ? [["flow.observe", { list: others }]] : [])];
  }
  const [dev] = names("developer");
  if (dev) {
    const out = [["flow.develop", { dev }]];
    if (observers.length) out.push(["flow.observe", { list: observers }]);
    if (names("tester").length) out.push(["flow.testAfter", { list: names("tester") }]);
    return out;
  }
  if (names("tester").length) return [["flow.test", { list: names("tester") }], ...(observers.length ? [["flow.observe", { list: observers }]] : [])];
  const consultants = names("consultant");
  if (consultants.length === 1) return [["flow.consultOne", { name: consultants[0] }], ...(observers.length ? [["flow.observe", { list: observers }]] : [])];
  if (consultants.length > 1) return [["flow.discuss", { list: consultants, n: 2 }]];
  if (observers.length) return [["flow.observeUser", { list: observers }]];
  return [["flow.nobody", {}]];
}
