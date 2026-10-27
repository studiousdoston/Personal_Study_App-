import { DECK_COLORS, DEFAULT_DECK_COLOR, type DeckColor } from "../constants";

function isDeckColor(color: string): color is DeckColor {
  return (DECK_COLORS as readonly string[]).includes(color);
}

export function deckColorVar(color: string): string {
  return `var(--deck-${isDeckColor(color) ? color : DEFAULT_DECK_COLOR})`;
}
