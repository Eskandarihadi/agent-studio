import { useState } from "react";
import { api } from "../lib/api.js";
import { useI18n } from "../lib/i18n.jsx";
import { ErrorAlert, KindBadge, ModeBadge } from "./ui.jsx";

const STATUS_COLOR = { applied: "success", rejected: "secondary", failed: "danger", cancelled: "secondary" };

// The path inside the project when it is there, otherwise the path as the agent gave it.
function shortPath(file, workdir) {
  const normal = (p) => p.replaceAll("\\", "/").replace(/\/+$/, "");
  const path = normal(file);
  const root = normal(workdir);
  return path.toLowerCase().startsWith(`${root.toLowerCase()}/`) ? path.slice(root.length + 1) : path;
}

function Lines({ text, sign }) {
  if (!text) return null;
  return text.replace(/\r?\n$/, "").split(/\r?\n/).map((line, i) => (
    <div key={i} className={sign === "+" ? "diff-add" : "diff-del"}>
      <span className="diff-sign">{sign}</span>
      {line || " "}
    </div>
  ));
}

function ChangeCard({ change, agent, session, onError }) {
  const { t } = useI18n();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const pending = change.status === "pending";

  async function answer(approved) {
    setBusy(true);
    onError("");
    try {
      await api.post(`/sessions/${session.id}/changes/${change.id}`, { approved, feedback: reason.trim() || undefined });
    } catch (err) {
      onError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className={`card change-card ${pending ? "pending" : ""}`}>
      <div className="card-body p-2">
        <div className="d-flex flex-wrap align-items-center gap-2 small mb-1">
          {agent && <KindBadge kind={agent.kind} />}
          <strong>{agent?.name || t("chat.deleted")}</strong>
          <ModeBadge mode={change.mode} />
          {!pending && <span className={`badge text-bg-${STATUS_COLOR[change.status]} ms-auto`}>{t(`code.status.${change.status}`)}</span>}
        </div>
        <div className="change-path" dir="ltr" title={change.file_path}>
          <i className="bi bi-file-earmark-code me-1" />
          {shortPath(change.file_path, session.workdir)}
        </div>
        {change.reason && <p className="small text-secondary mb-1 mt-1" dir="auto">{change.reason}</p>}
        <div className="change-diff" dir="ltr">
          <Lines text={change.old_text} sign="-" />
          <Lines text={change.new_text} sign="+" />
        </div>
        {pending && (
          <>
            <p className="small fw-semibold mb-1 mt-2">{t("code.ask")}</p>
            <input className="form-control form-control-sm mb-2" dir="auto" value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t("code.reason")} />
            <div className="d-flex gap-2">
              <button className="btn btn-sm btn-success flex-fill" disabled={busy} onClick={() => answer(true)}>
                <i className="bi bi-check-lg me-1" />
                {t("code.accept")}
              </button>
              <button className="btn btn-sm btn-outline-danger flex-fill" disabled={busy} onClick={() => answer(false)}>
                <i className="bi bi-x-lg me-1" />
                {t("code.reject")}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Waiting changes first, newest first; answered ones are folded away below them.
export default function ChangesPanel({ changes, agents, session }) {
  const { t } = useI18n();
  const [error, setError] = useState("");
  const agentById = (id) => agents.find((a) => a.id === id);
  const waiting = changes.filter((c) => c.status === "pending").reverse();
  const answered = changes.filter((c) => c.status !== "pending").reverse();
  const card = (c) => <ChangeCard key={c.id} change={c} agent={agentById(c.agent_id)} session={session} onError={setError} />;

  return (
    <aside className="changes-panel">
      <h2 className="h6 mb-2">
        <i className="bi bi-file-diff me-2" />
        {t("code.title")}
        {waiting.length > 0 && <span className="badge text-bg-warning ms-2">{waiting.length}</span>}
      </h2>
      <ErrorAlert error={error} onClose={() => setError("")} />
      {changes.length === 0 && <p className="small text-secondary">{t("code.empty")}</p>}
      {waiting.map(card)}
      {answered.length > 0 && (
        <details className="mt-2">
          <summary className="small text-secondary">{t("code.answered", { n: answered.length })}</summary>
          <div className="d-flex flex-column gap-2 mt-2">{answered.map(card)}</div>
        </details>
      )}
    </aside>
  );
}
