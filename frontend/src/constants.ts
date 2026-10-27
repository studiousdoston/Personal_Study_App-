export const QUIZ_MIN_CARDS = 4;

export const DECK_COLORS = ["green", "blue", "purple", "rose", "amber", "slate"] as const;

export const DECK_ICONS = [
  "book-open",
  "graduation-cap",
  "brain",
  "pen-line",
  "languages",
  "globe",
  "landmark",
  "music",
  "palette",
  "code",
  "database",
  "flask-conical",
  "atom",
  "dna",
  "heart-pulse",
  "calculator",
  "sigma",
  "chart-line",
  "briefcase",
  "scale",
  "camera",
  "dumbbell",
  "chef-hat",
  "plane",
] as const;

export type DeckColor = (typeof DECK_COLORS)[number];
export type DeckIcon = (typeof DECK_ICONS)[number];

export const DEFAULT_DECK_COLOR: DeckColor = "green";
export const DEFAULT_DECK_ICON: DeckIcon = "book-open";
