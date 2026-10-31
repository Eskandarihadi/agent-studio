import { useEffect, useState } from "react";
import { ErrorAlert, Markdown, Modal, PageHeader } from "../components/ui.jsx";
import { api } from "../lib/api.js";
import { useI18n } from "../lib/i18n.jsx";

const TEMPLATE = `---
name: my-skill
description: One sentence on what this skill does and when to use it
---

# My skill

Step-by-step instructions the agent follows when it uses this skill.
`;

function AddSkill({ onClose, onSaved }) {
  const { t } = useI18n();
  const [tab, setTab] = useState("github");
  const [url, setUrl] = useState("");
  const [preview, setPreview] = useState(null);
  const [name, setName] = useState("");
  const [content, setContent] = useState(TEMPLATE);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function run(fn) {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const loadPreview = (e) => {
    e.preventDefault();
    run(async () => {
      const p = await api.post("/skills/github/preview", { url });
      setPreview(p);
      setName(p.name);
    });
  };
  const importIt = () => run(async () => onSaved(await api.post("/skills/github/import", { url, name })));
  const saveManual = () => run(async () => onSaved(await api.post("/skills", { name, content })));
  const scripts = preview?.files.filter((f) => f.script) || [];

  return (
    <Modal title={t("skills.add")} onClose={onClose} size="xl">
      <ul className="nav nav-tabs mb-3">
        <li className="nav-item">
          <button className={`nav-link ${tab === "github" ? "active" : ""}`} onClick={() => setTab("github")}>
            <i className="bi bi-github me-1" /> {t("skills.fromGithub")}
          </button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${tab === "manual" ? "active" : ""}`} onClick={() => setTab("manual")}>
            <i className="bi bi-pencil me-1" /> {t("skills.write")}
          </button>
        </li>
      </ul>
      <ErrorAlert error={error} />

      {tab === "github" ? (
        <>
          <form className="d-flex gap-2 mb-2" onSubmit={loadPreview}>
            <input className="form-control" dir="ltr" type="url" value={url} onChange={(e) => setUrl(e.target.value)} required placeholder="https://github.com/anthropics/skills/tree/main/skills/pdf" />
            <button className="btn btn-outline-primary text-nowrap" disabled={busy}>{busy && !preview ? t("skills.loading") : t("skills.preview")}</button>
          </form>
          <p className="form-text">{t("skills.githubHint")}</p>
          {preview && (
            <div className="mt-3">
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label">{t("skills.libraryName")}</label>
                  <input className="form-control" dir="ltr" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="col-md-6">
                  <label className="form-label">{t("skills.description")}</label>
                  <p className="mb-0 small" dir="auto">{preview.description || "—"}</p>
                </div>
              </div>
              {scripts.length > 0 && (
                <div className="alert alert-warning mt-3 small mb-0">
                  <i className="bi bi-exclamation-triangle me-1" />
                  {t("skills.scriptsWarning", { n: scripts.length, files: scripts.map((f) => f.path).join(", ") })}
                </div>
              )}
              <details className="mt-3">
                <summary className="small">{t("skills.files", { n: preview.files.length })}</summary>
                <ul className="small mb-0" dir="ltr">
                  {preview.files.map((f) => (
                    <li key={f.path}>{f.path} <span className="text-secondary">({Math.ceil(f.size / 1024)} KB)</span></li>
                  ))}
                </ul>
              </details>
              <label className="form-label mt-3">SKILL.md</label>
              <pre className="border rounded p-3 bg-light skill-md" dir="ltr" style={{ maxHeight: 360, overflow: "auto", whiteSpace: "pre-wrap" }}>{preview.content}</pre>
              <button className="btn btn-primary" onClick={importIt} disabled={busy}>{busy ? t("skills.installing") : t("skills.install")}</button>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="mb-3">
            <label className="form-label">{t("skills.colName")}</label>
            <input className="form-control" dir="ltr" value={name} onChange={(e) => setName(e.target.value)} placeholder={t("skills.nameHint")} />
          </div>
          <label className="form-label">SKILL.md</label>
          <textarea className="form-control skill-md mb-3" dir="auto" rows={16} value={content} onChange={(e) => setContent(e.target.value)} />
          <button className="btn btn-primary" onClick={saveManual} disabled={busy}>{busy ? t("common.saving") : t("skills.saveSkill")}</button>
        </>
      )}
    </Modal>
  );
}

function SkillDetail({ id, onClose, onChanged }) {
  const { t } = useI18n();
  const [skill, setSkill] = useState(null);
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api.get(`/skills/${id}`).then((s) => {
      setSkill(s);
      setContent(s.content);
    }).catch((err) => setError(err.message));
  }, [id]);

  async function save() {
    try {
      const s = await api.put(`/skills/${id}`, { content });
      setSkill(s);
      setEditing(false);
      onChanged();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <Modal
      title={skill?.name || t("nav.skills")}
      onClose={onClose}
      size="xl"
      footer={
        editing ? (
          <>
            <button className="btn btn-light" onClick={() => setEditing(false)}>{t("common.cancel")}</button>
            <button className="btn btn-primary" onClick={save}>{t("common.save")}</button>
          </>
        ) : (
          <button className="btn btn-outline-primary" onClick={() => setEditing(true)} disabled={!skill}>{t("skills.editMd")}</button>
        )
      }
    >
      <ErrorAlert error={error} />
      {skill && (
        <>
          <p className="small text-secondary mb-2">
            {t("skills.source")}: {skill.source.startsWith("http") ? <a href={skill.source} target="_blank" rel="noreferrer" dir="ltr">{skill.source}</a> : t("skills.manual")} · {t("skills.files", { n: skill.files.length })}
          </p>
          {editing ? (
            <textarea className="form-control skill-md" dir="auto" rows={22} value={content} onChange={(e) => setContent(e.target.value)} />
          ) : (
            <Markdown>{skill.content.replace(/^---[\s\S]*?---\s*/, "")}</Markdown>
          )}
        </>
      )}
    </Modal>
  );
}

export default function Skills() {
  const { t } = useI18n();
  const [skills, setSkills] = useState([]);
  const [adding, setAdding] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [error, setError] = useState("");

  const load = () => api.get("/skills").then(setSkills).catch((err) => setError(err.message));
  useEffect(() => {
    load();
  }, []);

  async function remove(skill) {
    if (!confirm(t("skills.confirmDelete", { name: skill.name }))) return;
    await api.del(`/skills/${skill.id}`).catch((err) => setError(err.message));
    load();
  }

  return (
    <>
      <PageHeader title={t("skills.title")} subtitle={t("skills.subtitle")}>
        <button className="btn btn-primary" onClick={() => setAdding(true)}>
          <i className="bi bi-plus-lg me-1" /> {t("skills.add")}
        </button>
      </PageHeader>
      <ErrorAlert error={error} onClose={() => setError("")} />

      {skills.length === 0 ? (
        <div className="card card-body text-center text-secondary py-5">
          <i className="bi bi-puzzle fs-1 mb-2" />
          {t("skills.empty")}
        </div>
      ) : (
        <div className="card">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead>
                <tr>
                  <th>{t("skills.colName")}</th>
                  <th>{t("skills.colDescription")}</th>
                  <th>{t("skills.colSource")}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {skills.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <button className="btn btn-link p-0 fw-semibold" onClick={() => setViewing(s.id)}>{s.name}</button>
                    </td>
                    <td className="small text-secondary" dir="auto">{s.description}</td>
                    <td className="small">{s.source.startsWith("http") ? <i className="bi bi-github" title={s.source} /> : t("skills.manual")}</td>
                    <td className="text-end">
                      <button className="btn btn-sm btn-outline-danger" onClick={() => remove(s)} aria-label={`${t("common.delete")} ${s.name}`}>
                        <i className="bi bi-trash" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {adding && (
        <AddSkill
          onClose={() => setAdding(false)}
          onSaved={() => {
            setAdding(false);
            load();
          }}
        />
      )}
      {viewing && <SkillDetail id={viewing} onClose={() => setViewing(null)} onChanged={load} />}
    </>
  );
}
