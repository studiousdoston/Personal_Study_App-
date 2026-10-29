export const SILENT_HINT_STORAGE_KEY = "brainmaxx-silent-hint";

const HINT_DURATION_MS = 8000;

let hideAt: number | null = null;

function isIPad() {
  return (
    /iPad/.test(navigator.userAgent) ||
    (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1)
  );
}

export function isAppleTouchDevice() {
  return /iPhone|iPod/.test(navigator.userAgent) || isIPad();
}

export function silentModeSentence() {
  if (!isAppleTouchDevice()) return "On iPhone and iPad, silent mode also mutes these sounds.";
  return `Your ${isIPad() ? "iPad" : "iPhone"}'s silent mode also mutes these sounds.`;
}

export function silentHintTimeLeft() {
  if (hideAt === null) {
    hideAt = 0;
    if (!isAppleTouchDevice()) return 0;
    try {
      if (localStorage.getItem(SILENT_HINT_STORAGE_KEY) === "seen") return 0;
      localStorage.setItem(SILENT_HINT_STORAGE_KEY, "seen");
    } catch {
      // storage unavailable; show it once per page load
    }
    hideAt = Date.now() + HINT_DURATION_MS;
  }
  return Math.max(0, hideAt - Date.now());
}

export function dismissSilentHint() {
  hideAt = 0;
}
