import { type FeedbackDetail, type FeedbackMoment, onFeedback } from "./feedback";

export type SoundPreference = "on" | "off";

export const SOUND_STORAGE_KEY = "brainmaxx-sound";

const VOLUME = 0.15;
const SILENT = 0.0001;
const UNLOCK_EVENTS = ["pointerdown", "keydown", "touchend"] as const;

const C5 = 523.25;
const E5 = 659.25;
const G5 = 783.99;
const C6 = 1046.5;

type NavigatorWithAudioSession = Navigator & { audioSession?: { type: string } };

let context: AudioContext | null = null;
let noise: AudioBuffer | null = null;
let unlocked = false;
let started = false;

export function readSoundPreference(): SoundPreference {
  try {
    return localStorage.getItem(SOUND_STORAGE_KEY) === "off" ? "off" : "on";
  } catch {
    return "on";
  }
}

export function saveSoundPreference(preference: SoundPreference) {
  try {
    localStorage.setItem(SOUND_STORAGE_KEY, preference);
  } catch {
    // storage unavailable; the choice lasts until reload
  }
}

function getContext() {
  if (!context) context = new AudioContext();
  if (context.state === "suspended") void context.resume().catch(() => {});
  return context;
}

function unlock() {
  unlocked = true;
  try {
    if (getContext().state !== "running") return;
  } catch {
    return;
  }
  for (const name of UNLOCK_EVENTS) window.removeEventListener(name, unlock, true);
}

function envelope(ctx: AudioContext, start: number, duration: number, peak: number) {
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(SILENT, start);
  gain.gain.exponentialRampToValueAtTime(peak, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(SILENT, start + duration);
  gain.connect(ctx.destination);
  return gain;
}

function tone(
  ctx: AudioContext,
  frequency: number,
  delay: number,
  duration: number,
  options: { type?: OscillatorType; peak?: number; glideTo?: number } = {},
) {
  const start = ctx.currentTime + delay;
  const gain = envelope(ctx, start, duration, options.peak ?? VOLUME);
  const osc = ctx.createOscillator();
  osc.type = options.type ?? "sine";
  osc.frequency.setValueAtTime(frequency, start);
  if (options.glideTo)
    osc.frequency.exponentialRampToValueAtTime(options.glideTo, start + duration);
  osc.connect(gain);
  osc.onended = () => gain.disconnect();
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

function whoosh(ctx: AudioContext) {
  if (!noise) {
    noise = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.1), ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  const start = ctx.currentTime;
  const duration = 0.08;
  const gain = envelope(ctx, start, duration, VOLUME * 0.5);
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.Q.value = 1.2;
  filter.frequency.setValueAtTime(2400, start);
  filter.frequency.exponentialRampToValueAtTime(900, start + duration);
  const source = ctx.createBufferSource();
  source.buffer = noise;
  source.connect(filter);
  filter.connect(gain);
  source.onended = () => gain.disconnect();
  source.start(start);
  source.stop(start + duration + 0.02);
}

function arpeggio(ctx: AudioContext, notes: number[]) {
  notes.forEach((note, i) => tone(ctx, note, i * 0.07, 0.16, { type: "triangle" }));
}

export function playSound(moment: FeedbackMoment, detail?: FeedbackDetail) {
  if (!unlocked) return;
  try {
    const ctx = getContext();
    switch (moment) {
      case "flip":
        whoosh(ctx);
        break;
      case "correct":
        tone(ctx, C5, 0, 0.12, { type: "triangle" });
        tone(ctx, E5, 0.09, 0.18, { type: "triangle" });
        break;
      case "wrong":
        tone(ctx, 220, 0, 0.26, { type: "sine", peak: VOLUME * 0.9, glideTo: 185 });
        break;
      case "sessionDone":
        arpeggio(ctx, [C5, E5, G5]);
        break;
      case "quizDone":
        arpeggio(ctx, detail?.perfect ? [C5, E5, G5, C6] : [C5, E5, G5]);
        break;
    }
  } catch {
    // audio unavailable; stay silent
  }
}

export function startSoundFeedback() {
  if (started) return;
  started = true;
  try {
    const { audioSession } = navigator as NavigatorWithAudioSession;
    if (audioSession) audioSession.type = "ambient";
  } catch {
    // older browsers without audioSession
  }
  for (const name of UNLOCK_EVENTS) window.addEventListener(name, unlock, true);
  onFeedback((moment, detail) => {
    if (readSoundPreference() === "on") playSound(moment, detail);
  });
}
