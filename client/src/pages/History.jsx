import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ErrorAlert, PageHeader } from "../components/ui.jsx";
import { TYPE_ICON, api } from "../lib/api.js";
import { useI18n } from "../lib/i18n.jsx";

const STATUS_COLOR = { idle: "secondary", running: "primary", awaiting_approval: "warning" };

export default function History() {
  const { t, lang } = useI18n();
  const [sessions, setSessions] = useState([]);
  const [error, setError] = useState("");

  const load = () => api.get("/sessions").then(setSessions).catch((err) => setError(err.message));
  useEffect(() => {
    load();
  }, []);

  async function remove(s) {
    if (!confirm(t("history.confirmDelete", { title: s.title }))) return;
    await api.del(`/sessions/${s.id}`).catch((err) => setError(err.message));
    load();
  }

  const when = (d) => new Date(d).toLocaleString(lang === "fa" ? "fa-IR" : "en-GB", { dateStyle: "medium", timeStyle: "short" });

  return (
    <>
      <PageHeader title={t("history.title")} subtitle={t("history.subtitle")} />
      <ErrorAlert error={error} onClose={() => setError("")} />
      {sessions.length === 0 ? (
        <div className="card card-body text-center text-secondary py-5">
          <i className="bi bi-clock-history fs-1 mb-2" />
          {t("history.empty")}
        </div>
      ) : (
        <div className="list-group">
          {sessions.map((s) => (
            <div className="list-group-item d-flex align-items-center gap-3" key={s.id}>
              <i className={`bi ${TYPE_ICON[s.type]} fs-4 text-primary`} />
              <Link to={`/sessions/${s.id}`} className="flex-grow-1 text-decoration-none text-body min-w-0">
                <div className="fw-semibold text-truncate" dir="auto">{s.title === "New conversation" ? t("room.new") : s.title}</div>
                <div className="small text-secondary d-flex flex-wrap gap-2">
                  <span>{t(`history.type.${s.type}`)}</span>
                  <span>{when(s.updated_at)}</span>
                  <span className="font-monospace text-truncate" dir="ltr">{s.workdir}</span>
                </div>
              </Link>
              <span className={`badge text-bg-${STATUS_COLOR[s.status] || "secondary"}`}>{t(`status.${s.status}`)}</span>
              <button className="btn btn-sm btn-outline-danger" onClick={() => remove(s)} aria-label={t("common.delete")}>
                <i className="bi bi-trash" />
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
