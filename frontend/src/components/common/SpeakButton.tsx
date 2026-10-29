import {
  useEffect,
  useMemo,
  useSyncExternalStore,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import { Speech, Square } from "lucide-react";
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

  const label = speaking ? "Stop reading" : "Read aloud";
  const Icon = speaking ? Square : Speech;

  return (
    <button
      type="button"
      className={`${styles.button} ${speaking ? styles.speaking : ""}`}
      aria-label={label}
      title={label}
      onClick={onClick}
      onKeyDown={onKeyDown}
    >
      <Icon size={speaking ? 16 : 20} aria-hidden="true" />
    </button>
  );
}
