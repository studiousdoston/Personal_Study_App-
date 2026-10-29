import type confettiFn from "canvas-confetti";
import type { Options } from "canvas-confetti";
import { onFeedback } from "./feedback";
import { type ConfettiSize, confettiFor, getResultLevel } from "./resultLevel";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const COLOR_TOKENS = ["--color-primary", "--color-accent", "--color-progress"];
const BASE: Options = { zIndex: 100, disableForReducedMotion: true, ticks: 220 };

type Confetti = typeof confettiFn;
type Burst = { delay: number; options: Options };

const CENTER = { x: 0.5, y: 0.6 };
const BIG_CORNER: Options = { particleCount: 30, spread: 65, startVelocity: 55 };
const HUGE_CORNER: Options = { particleCount: 35, spread: 85, startVelocity: 65, ticks: 300 };

function corners(delay: number, options: Options): Burst[] {
  return [
    { delay, options: { ...options, angle: 60, origin: { x: 0, y: 1 } } },
    { delay, options: { ...options, angle: 120, origin: { x: 1, y: 1 } } },
  ];
}

const BURSTS: Record<ConfettiSize, Burst[]> = {
  small: [{ delay: 0, options: { particleCount: 60, spread: 70, origin: CENTER } }],
  big: [0, 400, 800].flatMap((delay) => corners(delay, BIG_CORNER)),
  huge: [
    ...[0, 350, 700, 1050, 1400].flatMap((delay) => corners(delay, HUGE_CORNER)),
    {
      delay: 500,
      options: { particleCount: 60, spread: 100, startVelocity: 45, ticks: 300, origin: CENTER },
    },
  ],
};

let loader: Promise<Confetti> | null = null;
let started = false;

function loadConfetti() {
  loader ??= import("canvas-confetti")
    .then((module) => module.default)
    .catch((error: unknown) => {
      loader = null;
      throw error;
    });
  return loader;
}

function brandColors() {
  const style = getComputedStyle(document.documentElement);
  return COLOR_TOKENS.map((token) => style.getPropertyValue(token).trim()).filter(Boolean);
}

export async function fireConfetti(size: ConfettiSize) {
  try {
    if (window.matchMedia(REDUCED_MOTION_QUERY).matches) return;
    const confetti = await loadConfetti();
    const colors = brandColors();
    for (const { delay, options } of BURSTS[size]) {
      const fire = () => void confetti({ ...BASE, colors, ...options });
      if (delay === 0) fire();
      else setTimeout(fire, delay);
    }
  } catch {
    // confetti is decoration; failures stay silent
  }
}

export function startConfettiFeedback() {
  if (started) return;
  started = true;
  onFeedback((moment, detail) => {
    if ((moment !== "sessionDone" && moment !== "quizDone") || !detail) return;
    const size = confettiFor(getResultLevel(detail.correct ?? 0, detail.total));
    if (size) void fireConfetti(size);
  });
}
