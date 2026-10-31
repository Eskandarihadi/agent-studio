import { useEffect, useState } from "react";
import ChangesPanel from "../components/ChangesPanel.jsx";
import Conversation from "../components/Conversation.jsx";
import { ErrorAlert, KindBadge, PageHeader } from "../components/ui.jsx";
import { MODE_COLOR, SPECIALIST_MODES, api, previewFlow } from "../lib/api.js";
import { useI18n } from "../lib/i18n.jsx";
import { useStudioMode } from "../lib/studioMode.jsx";
import { useSession } from "../lib/useSession.js";

const FOLDER_KEY = "agent-studio-folder";

function remembered() {
  try {
    return localStorage.getItem(FOLDER_KEY) || "";
  } catch {
    return "";
  }
}

function remember(folder) {
  try {
    localStorage.setItem(FOLDER_KEY, folder);
  } catch {
    // Storage can be blocked; the default folder is used next time.
  }
}

function AgentCard({ agent, working, log, onChange, onMention }) {
  const { t } = useI18n();
  return (
    <div className={`card room-agent ${agent.enabled ? "" : "off"} ${working ? "working" : ""}`}>
      <div className="card-body p-3">
        <div className="d-flex align-items-center gap-2 mb-2">
          <KindBadge kind={agent.kind} />
          <strong className="text-truncate">{agent.name}</strong>
          <span className={`status-dot ${working ? "on" : ""}`} title={working ? t("room.working") : t("room.idle")} />
          <div className="form-check form-switch m-0 ms-auto">
            <input
              className="form-check-input"
              type="checkbox"
              role="switch"
              checked={agent.enabled}
              onChange={() => onChange({ enabled: !agent.enabled })}
              aria-label={`${agent.name}: ${agent.enabled ? t("common.on") : t("common.off")}`}
            />
          </div>
        </div>

        {agent.kind === "S" ? (
          <div className="d-flex gap-2 align-items-center">
            <select
              className={`form-select form-select-sm border-${MODE_COLOR[agent.mode]}`}
              value={agent.mode}
              disabled={!agent.enabled}
              onChange={(e) => onChange({ mode: e.target.value })}
              aria-label={t("agents.mode")}
            >
              {SPECIALIST_MODES.map((m) => (
                <option key={m} value={m}>{t(`mode.${m}`)}</option>
              ))}
            </select>
            <button className="btn btn-sm btn-outline-secondary text-nowrap" disabled={!agent.enabled} onClick={onMention} title={t("room.ask")}>
              <i className="bi bi-at" />
            </button>
          </div>
        ) : (
          <button className="btn btn-sm btn-outline-secondary w-100" disabled={!agent.enabled} onClick={onMention}>
            <i className="bi bi-at me-1" />
            {t("room.use")}
          </button>
        )}

        {agent.enabled && (
          <ul className="agent-log mt-2 mb-0" dir="ltr">
            {log.length ? log.map((l) => <li key={l.id}>{l.content}</li>) : <li className="text-body-tertiary" dir="auto">{t("room.noLog")}</li>}
          </ul>
        )}
      </div>
    </div>
  );
}

export default function ControlRoom() {
  const { t, list } = useI18n();
  const [agents, setAgents] = useState([]);
  const [folders, setFolders] = useState([]);
  const [folder, setFolder] = useState(remembered());
  const [sessionId, setSessionId] = useState(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const { session, messages, changes, working } = useSession(sessionId);
  const { codeMode } = useStudioMode();

  const loadAgents = () => api.get("/agents").then(setAgents).catch((err) => setError(err.message));

  async function open(path, fresh = false) {
    setError("");
    try {
      const room = await api.post("/sessions/room", { workdir: path, fresh });
      setSessionId(room.id);
      remember(path);
      api.get("/sessions/folders").then(setFolders);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    loadAgents();
    api.get("/sessions/folders").then(setFolders);
    api.get("/health").then((h) => {
      const start = remembered() || h.defaultWorkdir;
      setFolder(start);
      open(start);
    });
  }, []);

  async function change(agent, patch) {
    setAgents((list) => list.map((a) => (a.id === agent.id ? { ...a, ...patch } : a)));
    try {
      await api.patch(`/agents/${agent.id}`, patch);
    } catch (err) {
      setError(err.message);
    }
    // Choosing a developer can move the previous one to consultant, so reload everyone.
    loadAgents();
  }

  // Puts "@Name " in front of the draft, replacing any earlier mention.
  const mention = (agent) =>
    setDraft((d) => {
      const earlier = agents.map((a) => `@${a.name} `).sort((x, y) => y.length - x.length).find((tag) => d.startsWith(tag));
      return `@${agent.name} ${earlier ? d.slice(earlier.length) : d}`;
    });
  const logOf = (agent) => messages.filter((m) => m.kind === "activity" && m.agent_id === agent.id).slice(-3);
  const hint = previewFlow(agents, draft).map(([key, vars]) => t(key, { ...vars, list: vars.list ? list(vars.list) : undefined })).join(" ");
  const specialists = agents.filter((a) => a.kind === "S");
  const assistants = agents.filter((a) => a.kind === "T");

  return (
    <>
      <PageHeader title={codeMode ? "Agent Studio Code" : t("room.title")} subtitle={codeMode ? t("code.subtitle") : t("room.subtitle")} />
      <ErrorAlert error={error} onClose={() => setError("")} />

      <form
        className="d-flex flex-wrap gap-2 mb-3 align-items-center"
        onSubmit={(e) => {
          e.preventDefault();
          open(folder);
        }}
      >
        <label className="form-label m-0 small text-secondary" htmlFor="folder">{t("room.folder")}</label>
        <input id="folder" className="form-control form-control-sm font-monospace flex-grow-1" style={{ minWidth: 240, maxWidth: 560 }} dir="ltr" list="folders" value={folder} onChange={(e) => setFolder(e.target.value)} />
        <datalist id="folders">{folders.map((f) => <option key={f} value={f} />)}</datalist>
        <button className="btn btn-sm btn-outline-primary">{t("room.open")}</button>
        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => open(folder, true)}>
          <i className="bi bi-plus-lg me-1" />
          {t("room.new")}
        </button>
      </form>

      <div className="row g-3">
        <div className={codeMode ? "col-lg-3" : "col-lg-4 col-xl-3"}>
          <div className="room-agents">
            {agents.length === 0 && <p className="text-secondary small">{t("room.noAgents")}</p>}
            {[...specialists, ...assistants].map((a) => (
              <AgentCard key={a.id} agent={a} working={!!working[a.id]} log={logOf(a)} onChange={(patch) => change(a, patch)} onMention={() => mention(a)} />
            ))}
          </div>
        </div>
        <div className={codeMode ? "col-lg-5" : "col-lg-8 col-xl-9"}>
          {session && (
            <>
              <h2 className="h6 text-secondary mb-3" dir="auto">{session.title === "New conversation" ? t("room.new") : session.title}</h2>
              <Conversation session={session} messages={messages} agents={agents} draft={draft} setDraft={setDraft} hint={hint} emptyText={t("room.empty")} allowFiles codeMode={codeMode} />
            </>
          )}
        </div>
        {codeMode && session && (
          <div className="col-lg-4">
            <ChangesPanel changes={changes} agents={agents} session={session} />
          </div>
        )}
      </div>
    </>
  );
}
