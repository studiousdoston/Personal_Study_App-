import { setAudioSessionType } from "./audioSession";
import { type SpeechLang, splitBySpeechLanguage } from "./speechSegments";

type SpeakOptions = { onEnd?: () => void };

type SpeechSession = { text: string; utterances: SpeechSynthesisUtterance[]; finish: () => void };

const RATE = 0.9;
const MAX_CHUNK_LENGTH = 180;
const VOICES_TIMEOUT_MS = 1500;
const SENTENCE_END = /(?<=[.!?。？！])\s+/;

let voices: SpeechSynthesisVoice[] | null = null;
let voicesLoading: Promise<void> | null = null;
let session: SpeechSession | null = null;
const listeners = new Set<() => void>();

export function isSpeechSupported() {
  return (
    typeof window !== "undefined" &&
    "speechSynthesis" in window &&
    typeof SpeechSynthesisUtterance !== "undefined"
  );
}

export function loadVoices(): Promise<void> {
  if (!isSpeechSupported()) return Promise.resolve();
  voicesLoading ??= new Promise<void>((resolve) => {
    const synth = window.speechSynthesis;
    if (synth.getVoices().length > 0) {
      voices = synth.getVoices();
      resolve();
      return;
    }
    const done = () => {
      clearTimeout(timer);
      synth.removeEventListener("voiceschanged", done);
      voices = synth.getVoices();
      resolve();
    };
    synth.addEventListener("voiceschanged", done);
    const timer = setTimeout(done, VOICES_TIMEOUT_MS);
  }).catch(() => {
    voices = [];
  });
  return voicesLoading;
}

function normalizeLang(lang: string) {
  return lang.replace("_", "-").toLowerCase();
}

export function pickVoice(lang: SpeechLang): SpeechSynthesisVoice | null {
  const all = voices?.length ? voices : window.speechSynthesis.getVoices();
  const prefix = lang.slice(0, 2);
  const exact = all.filter((voice) => normalizeLang(voice.lang) === lang.toLowerCase());
  const candidates = exact.length
    ? exact
    : all.filter((voice) => {
        const voiceLang = normalizeLang(voice.lang);
        return voiceLang === prefix || voiceLang.startsWith(`${prefix}-`);
      });
  return candidates.find((voice) => voice.localService) ?? candidates[0] ?? null;
}

function splitLong(text: string): string[] {
  const chunks: string[] = [];
  let current = "";
  for (const sentence of text.split(SENTENCE_END)) {
    if (current && current.length + sentence.length + 1 > MAX_CHUNK_LENGTH) {
      chunks.push(current);
      current = sentence;
    } else {
      current = current ? `${current} ${sentence}` : sentence;
    }
  }
  if (current) chunks.push(current);
  return chunks.flatMap(splitAtSpaces);
}

function splitAtSpaces(text: string): string[] {
  const chunks: string[] = [];
  let rest = text;
  while (rest.length > MAX_CHUNK_LENGTH) {
    const cut = rest.lastIndexOf(" ", MAX_CHUNK_LENGTH);
    const at = cut > 0 ? cut : MAX_CHUNK_LENGTH;
    chunks.push(rest.slice(0, at));
    rest = rest.slice(at).trimStart();
  }
  if (rest) chunks.push(rest);
  return chunks;
}

function notify() {
  listeners.forEach((listener) => listener());
}

export function subscribeSpeech(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSpokenText() {
  return session?.text ?? null;
}

export function stopSpeaking() {
  session?.finish();
  try {
    if (isSpeechSupported()) window.speechSynthesis.cancel();
  } catch {
    // nothing to stop
  }
}

export function speak(text: string, { onEnd }: SpeakOptions = {}) {
  stopSpeaking();
  const pieces = splitBySpeechLanguage(text).flatMap((segment) =>
    splitLong(segment.text).map((chunk) => ({ text: chunk, lang: segment.lang })),
  );
  if (!isSpeechSupported() || pieces.length === 0) {
    onEnd?.();
    return;
  }

  let ended = false;
  const current: SpeechSession = {
    text,
    utterances: [],
    finish: () => {
      if (ended) return;
      ended = true;
      setAudioSessionType("ambient");
      if (session === current) {
        session = null;
        notify();
      }
      onEnd?.();
    },
  };
  session = current;
  setAudioSessionType("playback");
  notify();

  const start = () => {
    if (session !== current) return;
    try {
      current.utterances = pieces.map((piece, index) => {
        const utterance = new SpeechSynthesisUtterance(piece.text);
        utterance.lang = piece.lang;
        utterance.voice = pickVoice(piece.lang);
        utterance.rate = RATE;
        utterance.onerror = () => {
          if (session === current) stopSpeaking();
        };
        if (index === pieces.length - 1) utterance.onend = current.finish;
        return utterance;
      });
      current.utterances.forEach((utterance) => window.speechSynthesis.speak(utterance));
    } catch {
      stopSpeaking();
    }
  };

  if (voices) start();
  else loadVoices().then(start, start);
}

export function toggleSpeech(text: string) {
  if (getSpokenText() === text) stopSpeaking();
  else speak(text);
}
