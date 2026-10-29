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

// must match the backend: settings.ai_max_input_chars / ai_max_cards (config.py)
// and MAX_SOURCES / MAX_INSTRUCTIONS_LENGTH (schemas/ai.py)
export const AI_MAX_INPUT_CHARS = 12000;
export const AI_MAX_CARDS = 30;
export const AI_MAX_SOURCES = 5;
export const AI_MAX_INSTRUCTIONS = 300;

// must match the backend: CardText max_length (schemas/card.py) and settings.upload_max_bytes
export const CARD_TEXT_MAX_LENGTH = 2000;
export const UPLOAD_MAX_MB = 10;
