// Agent Studio or Agent Studio Code, chosen in the header and remembered in this browser.
import { createContext, useContext, useEffect, useState } from "react";

const STORAGE_KEY = "agent-studio-code";

function saved() {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

const StudioModeContext = createContext(null);

export function StudioModeProvider({ children }) {
  const [codeMode, setCodeMode] = useState(saved);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, codeMode ? "1" : "0");
    } catch {
      // Storage can be blocked; the choice then lasts until reload.
    }
  }, [codeMode]);

  return <StudioModeContext.Provider value={{ codeMode, setCodeMode }}>{children}</StudioModeContext.Provider>;
}

export function useStudioMode() {
  return useContext(StudioModeContext);
}
