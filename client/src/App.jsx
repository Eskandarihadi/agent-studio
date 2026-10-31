import { NavLink, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { useI18n } from "./lib/i18n.jsx";
import { useStudioMode } from "./lib/studioMode.jsx";
import Agents from "./pages/Agents.jsx";
import ControlRoom from "./pages/ControlRoom.jsx";
import History from "./pages/History.jsx";
import SessionPage from "./pages/SessionPage.jsx";
import Skills from "./pages/Skills.jsx";

const links = [
  { to: "/room", icon: "bi-grid-1x2", key: "nav.room" },
  { to: "/agents", icon: "bi-robot", key: "nav.agents" },
  { to: "/skills", icon: "bi-puzzle", key: "nav.skills" },
  { to: "/history", icon: "bi-clock-history", key: "nav.history" },
];

// Like Claude's switch at the top of the app: the same control room, with or without the code panel.
function StudioSwitch() {
  const { t } = useI18n();
  const { codeMode, setCodeMode } = useStudioMode();
  const navigate = useNavigate();
  const choose = (on) => {
    setCodeMode(on);
    navigate("/room");
  };
  return (
    <div className="btn-group btn-group-sm" role="group" aria-label={t("code.switch")}>
      <button type="button" className={`btn ${codeMode ? "btn-outline-light" : "btn-light"}`} aria-pressed={!codeMode} onClick={() => choose(false)}>
        <i className="bi bi-diagram-3 me-1" />
        Agent Studio
      </button>
      <button type="button" className={`btn ${codeMode ? "btn-light" : "btn-outline-light"}`} aria-pressed={codeMode} onClick={() => choose(true)}>
        <i className="bi bi-code-slash me-1" />
        Agent Studio Code
      </button>
    </div>
  );
}

function LanguageSwitch() {
  const { lang, setLang } = useI18n();
  return (
    <div className="btn-group btn-group-sm" role="group" aria-label="Language / زبان">
      <button type="button" className={`btn ${lang === "en" ? "btn-light" : "btn-outline-light"}`} onClick={() => setLang("en")}>
        English
      </button>
      <button type="button" className={`btn ${lang === "fa" ? "btn-light" : "btn-outline-light"}`} onClick={() => setLang("fa")}>
        فارسی
      </button>
    </div>
  );
}

export default function App() {
  const { t } = useI18n();
  return (
    <>
      <header className="app-header navbar navbar-expand navbar-dark">
        <div className="container-fluid gap-3 flex-wrap">
          <StudioSwitch />
          <nav className="navbar-nav gap-1 flex-wrap me-auto">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} className="nav-link px-3 rounded">
                <i className={`bi ${l.icon} me-2`} />
                {t(l.key)}
              </NavLink>
            ))}
          </nav>
          <LanguageSwitch />
        </div>
      </header>
      <main className="main">
        <Routes>
          <Route path="/" element={<Navigate to="/room" replace />} />
          <Route path="/room" element={<ControlRoom />} />
          <Route path="/agents" element={<Agents />} />
          <Route path="/skills" element={<Skills />} />
          <Route path="/history" element={<History />} />
          <Route path="/sessions/:id" element={<SessionPage />} />
        </Routes>
      </main>
    </>
  );
}
