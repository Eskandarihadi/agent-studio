import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Conversation from "../components/Conversation.jsx";
import { ErrorAlert } from "../components/ui.jsx";
import { TYPE_ICON, api } from "../lib/api.js";
import { useI18n } from "../lib/i18n.jsx";
import { useSession } from "../lib/useSession.js";

// One conversation from the history, which can also be continued here.
export default function SessionPage() {
  const { id } = useParams();
  const { t } = useI18n();
  const [agents, setAgents] = useState([]);
  const [draft, setDraft] = useState("");
  const { session, messages, error } = useSession(id);

  useEffect(() => {
    api.get("/agents").then(setAgents);
  }, []);

  if (!session) return <ErrorAlert error={error} />;

  return (
    <>
      <Link to="/history" className="small text-decoration-none">
        <i className="bi bi-arrow-left flip-rtl" /> {t("chat.back")}
      </Link>
      <h1 className="h4 mt-1 mb-1" dir="auto">
        <i className={`bi ${TYPE_ICON[session.type]} me-2 text-primary`} />
        {session.title === "New conversation" ? t("room.new") : session.title}
      </h1>
      <div className="small text-secondary d-flex flex-wrap gap-3 mb-3">
        <span>{t(`history.type.${session.type}`)}</span>
        <span className="font-monospace" dir="ltr">{session.workdir}</span>
      </div>
      <Conversation session={session} messages={messages} agents={agents} draft={draft} setDraft={setDraft} emptyText="" />
    </>
  );
}
