import "bootstrap-icons/font/bootstrap-icons.css";
import "./app.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { I18nProvider, applyLang, savedLang } from "./lib/i18n.jsx";
import { StudioModeProvider } from "./lib/studioMode.jsx";

// Bootstrap's left-to-right or right-to-left stylesheet is chosen with the language.
applyLang(savedLang());

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <I18nProvider>
      <StudioModeProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </StudioModeProvider>
    </I18nProvider>
  </StrictMode>,
);
