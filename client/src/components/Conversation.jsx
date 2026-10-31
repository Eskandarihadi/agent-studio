import { useEffect, useMemo, useRef, useState } from "react";
import { api, uploadFile } from "../lib/api.js";
import { useI18n } from "../lib/i18n.jsx";
import { ErrorAlert, KindBadge, Markdown, ModeBadge } from "./ui.jsx";

// Runs of activity lines from the same agent are folded into one collapsible row.
function group(messages) {
  const out = [];
  for (const m of messages) {
    const last = out[out.length - 1];
    if (m.kind === "activity" && last?.kind === "activity-group" && last.agentId === m.agent_id) last.items.push(m);
    else if (m.kind === "activity") out.push({ kind: "activity-group", agentId: m.agent_id, id: `g${m.id}`, items: [m] });
    else out.push(m);
  }
  return out;
}

const MAX_FILES = 10;
const MAX_FILE_BYTES = 25 * 1024 * 1024;

function fileIcon(name) {
  if (/\.(png|jpe?g|gif|webp|svg|bmp|avif)$/i.test(name)) return "bi-file-earmark-image";
  if (/\.pdf$/i.test(name)) return "bi-file-earmark-pdf";
  if (/\.(docx?|odt|rtf)$/i.test(name)) return "bi-file-earmark-word";
  if (/\.(xlsx?|csv|ods)$/i.test(name)) return "bi-file-earmark-spreadsheet";
  if (/\.(md|txt)$/i.test(name)) return "bi-file-earmark-text";
  if (/\.(js|jsx|ts|tsx|py|json|html|css|sql)$/i.test(name)) return "bi-file-earmark-code";
  return "bi-file-earmark";
}

function sizeLabel(bytes) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// Agent results that can be chosen for a joint conclusion.
const RESULT_KINDS = ["text", "result", "review", "plan", "joint"];
const isResult = (m) => m.author === "agent" && m.agent_id && RESULT_KINDS.includes(m.kind);

function Message({ m, agent, picked, onPick }) {
  const { t } = useI18n();
  if (m.author === "user") {
    let content = m.content;
    if (m.kind === "approval") content = m.content.replace(/^Approved\./, t("chat.approved"));
    if (m.kind === "converge") content = t("chat.convergeAsk", { n: m.meta?.count ?? "" });
    return (
      <div className={`msg user ${m.kind === "approval" ? "approval" : ""}`}>
        {m.kind === "approval" && <i className="bi bi-check2-circle me-1" />}
        <Markdown>{content}</Markdown>
        {m.meta?.files?.length > 0 && (
          <div className="msg-files">
            {m.meta.files.map((f, i) => (
              <span key={i} className="file-chip" dir="auto">
                <i className={`bi ${fileIcon(f.name)}`} />
                {f.name}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  }
  if (m.author === "system") {
    return <div className={`msg ${m.kind === "error" ? "error" : "system"}`} dir="auto">{m.content === "Stopped." ? t("chat.stopped") : m.content}</div>;
  }
  const tags = [];
  if (m.kind === "plan") tags.push(t("chat.plan"));
  if (m.kind === "result") tags.push(t("chat.result"));
  if (m.kind === "review") tags.push(m.meta?.checkpoint ? t("chat.checkpoint", { n: m.meta.checkpoint }) : m.meta?.final ? t("chat.final") : t("chat.review"));
  if (m.kind === "joint") tags.push(t("chat.joint"));
  if (m.meta?.round) tags.push(t("chat.round", { n: m.meta.round }));
  return (
    <div className={`msg ${m.kind}`}>
      <div className="d-flex flex-wrap align-items-center gap-2 mb-2 small">
        {agent && <KindBadge kind={agent.kind} />}
        <strong>{agent?.name || t("chat.deleted")}</strong>
        <ModeBadge mode={m.mode} />
        {tags.map((tag) => <span key={tag} className="text-secondary">· {tag}</span>)}
        {onPick && (
          <div className="form-check m-0 ms-auto">
            <input className="form-check-input" type="checkbox" id={`pick-${m.id}`} checked={picked} onChange={onPick} />
            <label className="form-check-label text-secondary" htmlFor={`pick-${m.id}`}>{t("chat.pick")}</label>
          </div>
        )}
      </div>
      <Markdown>{m.content}</Markdown>
    </div>
  );
}

// allowFiles turns on attachments in the composer (used by the control room).
export default function Conversation({ session, messages, agents, draft, setDraft, hint, emptyText, allowFiles = false, codeMode = false }) {
  const { t } = useI18n();
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [files, setFiles] = useState([]);
  const [picked, setPicked] = useState([]);
  const picker = useRef(null);

  // Files upload as soon as they are picked, so sending is instant.
  function addFiles(list) {
    const picked = [...list];
    if (files.length + picked.length > MAX_FILES) {
      setError(t("chat.tooManyFiles", { n: MAX_FILES }));
      return;
    }
    for (const file of picked) {
      if (file.size > MAX_FILE_BYTES) {
        setError(t("chat.fileTooBig", { name: file.name }));
        continue;
      }
      const key = `${file.name}-${file.size}-${Math.random()}`;
      setFiles((f) => [...f, { key, name: file.name, size: file.size, status: "uploading" }]);
      uploadFile(session.id, file)
        .then((saved) => setFiles((f) => f.map((x) => (x.key === key ? { ...x, ...saved, name: file.name, status: "ready" } : x))))
        .catch((err) => {
          setFiles((f) => f.filter((x) => x.key !== key));
          setError(`${file.name}: ${err.message}`);
        });
    }
  }

  const uploading = files.some((f) => f.status === "uploading");
  const grouped = useMemo(() => group(messages), [messages]);
  const agentById = (id) => agents.find((a) => a.id === id);

  // Scroll the page to its very end: scrolling to the last message would leave it under the sticky composer.
  useEffect(() => {
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" });
  }, [messages.length, session?.status]);

  async function call(url, body) {
    setError("");
    try {
      await api.post(url, body);
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  }

  async function send(e) {
    e?.preventDefault();
    if (!draft.trim() || uploading) return;
    const attached = files.map((f) => ({ path: f.path, name: f.name }));
    if (await call(`/sessions/${session.id}/messages`, { text: draft, files: attached, codeMode })) {
      setDraft("");
      setFiles([]);
    }
  }

  async function approve() {
    if (await call(`/sessions/${session.id}/approve`, { note: note || undefined, codeMode })) setNote("");
  }

  const running = session.status === "running";
  const awaiting = session.status === "awaiting_approval";
  // "All results" means everything the agents said since your last message.
  const lastUser = messages.findLastIndex((m) => m.author === "user" && m.kind !== "converge");
  const latest = messages.slice(lastUser + 1).filter(isResult).map((m) => Number(m.id));
  const togglePick = (id) => setPicked((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]));

  async function converge() {
    if (await call(`/sessions/${session.id}/converge`, { messageIds: picked })) setPicked([]);
  }

  return (
    <div className="conversation">
      <div className="timeline">
        {messages.length === 0 && <p className="text-secondary">{emptyText}</p>}
        {grouped.map((m) =>
          m.kind === "activity-group" ? (
            <details className="activity" key={m.id}>
              <summary>
                <i className="bi bi-gear me-1" />
                {t(m.items.length > 1 ? "chat.steps" : "chat.step", { name: agentById(m.agentId)?.name || t("chat.deleted"), n: m.items.length })}
                <span className="ms-1 text-body-tertiary" dir="ltr">({m.items[m.items.length - 1].content})</span>
              </summary>
              <ul dir="ltr">{m.items.map((a) => <li key={a.id}>{a.content}</li>)}</ul>
            </details>
          ) : (
            <Message
              key={m.id}
              m={m}
              agent={agentById(m.agent_id)}
              picked={picked.includes(Number(m.id))}
              onPick={!running && isResult(m) ? () => togglePick(Number(m.id)) : undefined}
            />
          ),
        )}
        {running && (
          <div className="d-flex align-items-center gap-2 text-primary small">
            <span className="spinner-border spinner-border-sm" />
            {t("chat.working")}
            <button className="btn btn-sm btn-outline-danger ms-2" onClick={() => call(`/sessions/${session.id}/stop`)}>{t("chat.stop")}</button>
          </div>
        )}
      </div>

      <div className="composer">
        <ErrorAlert error={error} onClose={() => setError("")} />
        {awaiting && (
          <div className="card border-warning mb-2">
            <div className="card-body py-2">
              <div className="fw-semibold mb-2"><i className="bi bi-hourglass-split me-1" /> {t("chat.awaiting")}</div>
              <div className="d-flex gap-2">
                <input className="form-control form-control-sm" dir="auto" value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("chat.note")} />
                <button className="btn btn-sm btn-success text-nowrap" onClick={approve}><i className="bi bi-check-lg" /> {t("chat.approve")}</button>
              </div>
              <div className="form-text">{t("chat.orRevise")}</div>
            </div>
          </div>
        )}
        {!running && (picked.length > 0 || latest.length > 1) && (
          <div className="converge-bar small mb-2">
            <span>{picked.length > 0 ? t("chat.picked", { n: picked.length }) : t("chat.pickHint")}</span>
            <div className="d-flex flex-wrap gap-2 ms-auto">
              {latest.length > 1 && <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setPicked(latest)}>{t("chat.pickAll")}</button>}
              {picked.length > 0 && <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setPicked([])}>{t("chat.pickClear")}</button>}
              <button type="button" className="btn btn-sm btn-primary" disabled={picked.length < 2} onClick={converge}>
                <i className="bi bi-people me-1" />
                {t("chat.converge")}
              </button>
            </div>
          </div>
        )}
        {hint && !awaiting && <div className="flow-hint small mb-2">{hint}</div>}
        {files.length > 0 && (
          <div className="composer-files mb-2">
            {files.map((f) => (
              <span key={f.key} className="file-chip" dir="auto">
                {f.status === "uploading" ? <span className="spinner-border spinner-border-sm" role="status" aria-label={t("chat.uploading")} /> : <i className={`bi ${fileIcon(f.name)}`} />}
                <span className="text-truncate">{f.name}</span>
                <span className="text-secondary" dir="ltr">{sizeLabel(f.size)}</span>
                <button type="button" className="btn-close btn-close-sm" aria-label={t("chat.removeFile", { name: f.name })} onClick={() => setFiles((list) => list.filter((x) => x.key !== f.key))} />
              </span>
            ))}
          </div>
        )}
        <form
          className="d-flex gap-2"
          onSubmit={send}
          onDragOver={(e) => allowFiles && !running && e.preventDefault()}
          onDrop={(e) => {
            if (!allowFiles || running) return;
            e.preventDefault();
            addFiles(e.dataTransfer.files);
          }}
        >
          {allowFiles && (
            <>
              <input ref={picker} type="file" multiple hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
              <button type="button" className="btn btn-outline-secondary px-3" disabled={running || files.length >= MAX_FILES} onClick={() => picker.current?.click()} aria-label={t("chat.attach")} title={t("chat.attach")}>
                <i className="bi bi-paperclip" />
              </button>
            </>
          )}
          <textarea
            className="form-control"
            dir="auto"
            rows={2}
            value={draft}
            disabled={running}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.ctrlKey || e.metaKey) && send(e)}
            placeholder={awaiting ? t("chat.revisePlaceholder") : t("chat.placeholder")}
          />
          <button className="btn btn-primary px-4" disabled={running || uploading || !draft.trim()} aria-label={awaiting ? t("chat.revise") : t("chat.send")} title="Ctrl+Enter">
            {awaiting ? t("chat.revise") : t("chat.send")}
          </button>
        </form>
      </div>
    </div>
  );
}
