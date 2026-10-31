import { useEffect, useState } from "react";
import { ErrorAlert, KindBadge, Modal, ModeBadge, PageHeader } from "../components/ui.jsx";
import { SPECIALIST_MODES, api } from "../lib/api.js";
import { useI18n } from "../lib/i18n.jsx";

const EMPTY = { name: "", kind: "S", description: "", instructions: "", model: "", tools: "read", mode: "consultant", enabled: true, skillIds: [] };
const TOOLS_HELP = { none: "agents.helpNone", read: "agents.helpRead", write: "agents.helpWrite" };

function AgentForm({ agent, skills, onClose, onSaved }) {
  const { t } = useI18n();
  const [form, setForm] = useState(agent ? { ...agent, model: agent.model || "", skillIds: agent.skill_ids } : EMPTY);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const set = (field) => (e) => setForm({ ...form, [field]: e.target.type === "checkbox" ? e.target.checked : e.target.value });

  function toggleSkill(id) {
    const ids = form.skillIds.includes(id) ? form.skillIds.filter((s) => s !== id) : [...form.skillIds, id];
    setForm({ ...form, skillIds: ids });
  }

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const body = {
      name: form.name,
      description: form.description,
      instructions: form.instructions,
      model: form.model || null,
      tools: form.tools,
      enabled: form.enabled,
      mode: form.kind === "T" ? "assistant" : form.mode,
      skillIds: form.skillIds,
    };
    try {
      if (agent) await api.patch(`/agents/${agent.id}`, body);
      else await api.post("/agents", { ...body, kind: form.kind });
      onSaved();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <Modal
      title={agent ? t("agents.editTitle", { name: agent.name }) : t("agents.new")}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-light" onClick={onClose}>{t("common.cancel")}</button>
          <button className="btn btn-primary" form="agent-form" disabled={saving}>{saving ? t("common.saving") : t("common.save")}</button>
        </>
      }
    >
      <form id="agent-form" onSubmit={save}>
        <ErrorAlert error={error} />
        <div className="row g-3">
          <div className="col-md-8">
            <label className="form-label">{t("agents.name")}</label>
            <input className="form-control" dir="auto" value={form.name} onChange={set("name")} required maxLength={80} />
          </div>
          <div className="col-md-4">
            <label className="form-label">{t("agents.type")}</label>
            <select className="form-select" value={form.kind} onChange={set("kind")} disabled={!!agent}>
              <option value="S">{t("agents.typeS")}</option>
              <option value="T">{t("agents.typeT")}</option>
            </select>
          </div>
          <div className="col-12">
            <label className="form-label">{t("agents.expertise")}</label>
            <input className="form-control" dir="auto" value={form.description} onChange={set("description")} placeholder={t("agents.expertiseHint")} />
          </div>
          <div className="col-12">
            <label className="form-label">{t("agents.instructions")}</label>
            <textarea className="form-control" dir="auto" rows={5} value={form.instructions} onChange={set("instructions")} placeholder={t("agents.instructionsHint")} />
          </div>
          {form.kind === "S" && (
            <div className="col-md-4">
              <label className="form-label">{t("agents.mode")}</label>
              <select className="form-select" value={form.mode} onChange={set("mode")}>
                {SPECIALIST_MODES.map((m) => <option key={m} value={m}>{t(`mode.${m}`)}</option>)}
              </select>
            </div>
          )}
          <div className={form.kind === "S" ? "col-md-4" : "col-md-6"}>
            <label className="form-label">{t("agents.model")}</label>
            <select className="form-select" value={form.model} onChange={set("model")}>
              <option value="">{t("common.default")}</option>
              <option value="opus">{t("agents.opus")}</option>
              <option value="sonnet">{t("agents.sonnet")}</option>
              <option value="haiku">{t("agents.haiku")}</option>
            </select>
          </div>
          <div className={form.kind === "S" ? "col-md-4" : "col-md-6"}>
            <label className="form-label">{t("agents.tools")}</label>
            <select className="form-select" value={form.tools} onChange={set("tools")}>
              <option value="none">{t("agents.toolsNone")}</option>
              <option value="read">{t("agents.toolsRead")}</option>
              <option value="write">{t("agents.toolsWrite")}</option>
            </select>
          </div>
          <div className="col-12 form-text mt-1">{t(TOOLS_HELP[form.tools])}</div>
          <div className="col-12">
            <label className="form-label">{t("agents.skills")}</label>
            {skills.length === 0 ? (
              <p className="text-secondary small mb-0">{t("agents.noSkills")}</p>
            ) : (
              <div className="border rounded p-2" style={{ maxHeight: 200, overflowY: "auto" }}>
                {skills.map((s) => (
                  <div className="form-check" key={s.id}>
                    <input className="form-check-input" type="checkbox" id={`skill-${s.id}`} checked={form.skillIds.includes(s.id)} onChange={() => toggleSkill(s.id)} />
                    <label className="form-check-label" htmlFor={`skill-${s.id}`}>
                      <strong>{s.name}</strong> <span className="text-secondary small">{s.description}</span>
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="col-12">
            <div className="form-check form-switch">
              <input className="form-check-input" type="checkbox" id="enabled" checked={form.enabled} onChange={set("enabled")} />
              <label className="form-check-label" htmlFor="enabled">{t("agents.enabled")}</label>
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
}

export default function Agents() {
  const { t } = useI18n();
  const [agents, setAgents] = useState([]);
  const [skills, setSkills] = useState([]);
  const [filter, setFilter] = useState("all");
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState("");

  const load = () =>
    Promise.all([api.get("/agents"), api.get("/skills")])
      .then(([a, s]) => {
        setAgents(a);
        setSkills(s);
      })
      .catch((err) => setError(err.message));

  useEffect(() => {
    load();
  }, []);

  async function toggle(agent) {
    setAgents(agents.map((a) => (a.id === agent.id ? { ...a, enabled: !a.enabled } : a)));
    await api.patch(`/agents/${agent.id}`, { enabled: !agent.enabled }).catch((err) => setError(err.message));
    load();
  }

  async function remove(agent) {
    if (!confirm(t("agents.confirmDelete", { name: agent.name }))) return;
    await api.del(`/agents/${agent.id}`).catch((err) => setError(err.message));
    load();
  }

  const shown = agents.filter((a) => filter === "all" || a.kind === filter);
  const skillName = (id) => skills.find((s) => s.id === id)?.name;
  const toolsLabel = { none: t("agents.toolsNone"), read: t("agents.toolsRead"), write: t("agents.toolsWrite") };

  return (
    <>
      <PageHeader title={t("agents.title")} subtitle={t("agents.subtitle")}>
        <button className="btn btn-primary" onClick={() => setEditing("new")}>
          <i className="bi bi-plus-lg me-1" /> {t("agents.new")}
        </button>
      </PageHeader>
      <ErrorAlert error={error} onClose={() => setError("")} />

      <ul className="nav nav-pills mb-3">
        {[["all", "agents.all"], ["S", "agents.specialists"], ["T", "agents.assistants"]].map(([key, label]) => (
          <li className="nav-item" key={key}>
            <button className={`nav-link ${filter === key ? "active" : ""}`} onClick={() => setFilter(key)}>{t(label)}</button>
          </li>
        ))}
      </ul>

      <div className="row g-3">
        {shown.map((a) => (
          <div className="col-md-6 col-xl-4" key={a.id}>
            <div className={`card h-100 agent-card ${a.enabled ? "" : "off"}`}>
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <div className="d-flex align-items-center gap-2">
                    <KindBadge kind={a.kind} />
                    <h5 className="card-title mb-0" dir="auto">{a.name}</h5>
                  </div>
                  <div className="form-check form-switch m-0">
                    <input className="form-check-input" type="checkbox" role="switch" checked={a.enabled} onChange={() => toggle(a)} aria-label={a.name} />
                  </div>
                </div>
                <p className="card-text text-secondary small" dir="auto">{a.description || t("agents.noExpertise")}</p>
                <div className="d-flex flex-wrap gap-1">
                  <ModeBadge mode={a.mode} />
                  <span className="badge text-bg-light border">{t("agents.toolsBadge", { tools: toolsLabel[a.tools] })}</span>
                  {a.model && <span className="badge text-bg-light border">{a.model}</span>}
                  {a.skill_ids.map((id) => (
                    <span className="badge text-bg-warning-subtle border" key={id}>
                      <i className="bi bi-puzzle me-1" />
                      {skillName(id)}
                    </span>
                  ))}
                </div>
              </div>
              <div className="card-footer bg-transparent d-flex gap-2">
                <button className="btn btn-sm btn-outline-primary" onClick={() => setEditing(a)}>{t("common.edit")}</button>
                <button className="btn btn-sm btn-outline-danger ms-auto" onClick={() => remove(a)} aria-label={`${t("common.delete")} ${a.name}`}>
                  <i className="bi bi-trash" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <AgentForm
          agent={editing === "new" ? null : editing}
          skills={skills}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </>
  );
}
