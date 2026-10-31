import { useEffect, useState } from "react";
import { api } from "./api.js";

// Loads one conversation and keeps it live: new messages, its status, and which agents are working.
export function useSession(id) {
  const [session, setSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [changes, setChanges] = useState([]);
  const [working, setWorking] = useState({});
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return undefined;
    setSession(null);
    setMessages([]);
    setChanges([]);
    setWorking({});
    const load = () =>
      api.get(`/sessions/${id}`).then((d) => {
        setSession(d.session);
        setMessages(d.messages);
        setChanges(d.changes);
      }).catch((err) => setError(err.message));

    const events = new EventSource(`/api/sessions/${id}/events`);
    // Also runs after a reconnect (for example a server restart), so nothing sent meanwhile is missed.
    events.onopen = load;
    events.addEventListener("message", (e) => {
      const m = JSON.parse(e.data);
      setMessages((list) => (list.some((x) => x.id === m.id) ? list : [...list, m]));
    });
    events.addEventListener("change", (e) => {
      const c = JSON.parse(e.data);
      setChanges((list) => (list.some((x) => x.id === c.id) ? list.map((x) => (x.id === c.id ? c : x)) : [...list, c]));
    });
    events.addEventListener("session", (e) => {
      const s = JSON.parse(e.data);
      setSession(s);
      if (s.status !== "running") setWorking({});
    });
    events.addEventListener("agent", (e) => {
      const { agentId, state } = JSON.parse(e.data);
      setWorking((w) => ({ ...w, [agentId]: state === "working" }));
    });
    return () => events.close();
  }, [id]);

  return { session, messages, changes, working, error, setError };
}
