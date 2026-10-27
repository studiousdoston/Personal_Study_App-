import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "../hooks/useTheme";
import { nextThemePreference, type ThemePreference } from "../utils/theme";
import styles from "./ThemeToggle.module.css";

const LABELS: Record<ThemePreference, string> = {
  system: "System",
  light: "Light",
  dark: "Dark",
};

const ICONS = {
  system: Monitor,
  light: Sun,
  dark: Moon,
};

export function ThemeToggle() {
  const { preference, cycleTheme } = useTheme();
  const Icon = ICONS[preference];
  const label = `Theme: ${LABELS[preference]}. Switch to ${LABELS[nextThemePreference(preference)]}`;

  return (
    <button
      type="button"
      className={styles.iconButton}
      onClick={cycleTheme}
      aria-label={label}
      title={label}
    >
      <Icon size={20} aria-hidden="true" />
    </button>
  );
}
