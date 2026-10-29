import { useState } from "react";
import { playSound, readSoundPreference, saveSoundPreference } from "../utils/sound";

export function useSoundEnabled() {
  const [enabled, setEnabled] = useState(() => readSoundPreference() === "on");

  function toggleSound() {
    const next = !enabled;
    saveSoundPreference(next ? "on" : "off");
    setEnabled(next);
    if (next) playSound("correct");
  }

  return { enabled, toggleSound };
}
