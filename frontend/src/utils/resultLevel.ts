export type ResultLevel = "perfect" | "outstanding" | "excellent" | "great" | "good" | "keepGoing";

export type ConfettiSize = "huge" | "big" | "small";

const THRESHOLDS: [number, ResultLevel][] = [
  [0.95, "outstanding"],
  [0.9, "excellent"],
  [0.75, "great"],
  [0.5, "good"],
];

const MESSAGES: Record<ResultLevel, string[]> = {
  perfect: ["Perfect!", "Flawless."],
  outstanding: ["Outstanding.", "Nearly perfect."],
  excellent: ["Excellent work.", "Superb."],
  great: ["Great job.", "Solid work."],
  good: ["Good progress.", "Getting there."],
  keepGoing: ["Keep going. These cards will come back.", "Every miss is a card you'll learn next."],
};

export function getResultLevel(correct: number, total: number): ResultLevel | null {
  if (total <= 0) return null;
  const ratio = correct / total;
  if (ratio >= 1) return "perfect";
  return THRESHOLDS.find(([min]) => ratio >= min)?.[1] ?? "keepGoing";
}

export function pickResultMessage(level: ResultLevel) {
  const options = MESSAGES[level];
  return options[Math.floor(Math.random() * options.length)];
}

export function confettiFor(level: ResultLevel | null): ConfettiSize | null {
  if (level === "perfect") return "huge";
  if (level === "outstanding") return "big";
  if (level === "excellent") return "small";
  return null;
}
