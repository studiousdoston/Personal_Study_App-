import { useEffect, useState } from "react";
import {
  applyTheme,
  DARK_MEDIA_QUERY,
  nextThemePreference,
  readThemePreference,
  resolveTheme,
  saveThemePreference,
} from "../utils/theme";

export function useTheme() {
  const [preference, setPreference] = useState(readThemePreference);
  const [resolved, setResolved] = useState(() => resolveTheme(preference));

  useEffect(() => {
    applyTheme(resolved);
  }, [resolved]);

  useEffect(() => {
    if (preference !== "system") return;
    const query = window.matchMedia(DARK_MEDIA_QUERY);
    const handleChange = () => setResolved(resolveTheme("system"));
    query.addEventListener("change", handleChange);
    return () => query.removeEventListener("change", handleChange);
  }, [preference]);

  function cycleTheme() {
    const next = nextThemePreference(preference);
    saveThemePreference(next);
    setPreference(next);
    setResolved(resolveTheme(next));
  }

  return { preference, resolved, cycleTheme };
}
