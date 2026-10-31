// Live updates for the session page, sent as Server-Sent Events.
const listeners = new Map();

export function subscribe(sessionId, res) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  res.write(": connected\n\n");
  if (!listeners.has(sessionId)) listeners.set(sessionId, new Set());
  listeners.get(sessionId).add(res);
  const ping = setInterval(() => res.write(": ping\n\n"), 25000);
  res.on("close", () => {
    clearInterval(ping);
    listeners.get(sessionId)?.delete(res);
  });
}

export function publish(sessionId, event, data) {
  for (const res of listeners.get(sessionId) || []) {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  }
}
