import {
  useEffect,
  useMemo,
  useSyncExternalStore,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import { Square, Volume2 } from "lucide-react";
import { markdownToPlainText } from "../../utils/markdownToPlainText";
import {
  getSpokenText,
  isSpeechSupported,
  loadVoices,
  stopSpeaking,
  subscribeSpeech,
  toggleSpeech,
} from "../../utils/speech";
import styles from "./SpeakButton.module.css";

export function SpeakButton({ markdown }: { markdown: string }) {
  const text = useMemo(() => markdownToPlainText(markdown), [markdown]);
  const speaking = useSyncExternalStore(subscribeSpeech, () => getSpokenText() === text);

  useEffect(() => {
    loadVoices();
  }, []);

  useEffect(() => {
    return () => {
      if (getSpokenText() === text) stopSpeaking();
    };
  }, [text]);

  if (!isSpeechSupported() || text === "") return null;

  const onClick = (e: MouseEvent) => {
    e.stopPropagation();
    toggleSpeech(text);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === " " || e.key === "Enter") e.stopPropagation();
  };

  const Icon = speaking ? Square : Volume2;

  return (
    <button
      type="button"
      className={`${styles.button} ${speaking ? styles.speaking : ""}`}
      onClick={onClick}
      onKeyDown={onKeyDown}
    >
      <Icon size={16} aria-hidden="true" />
      {speaking ? "Stop" : "Listen"}
    </button>
  );
}
