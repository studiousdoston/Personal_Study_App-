import type { Card } from "../types/models";
import { isDue } from "./isDue";

export type CardFilter = {
  query: string;
  dueOnly: boolean;
  now: number;
};

function normalize(text: string): string {
  return text.normalize("NFC").toLowerCase();
}

export function isFilterActive({ query, dueOnly }: Pick<CardFilter, "query" | "dueOnly">): boolean {
  return query.trim() !== "" || dueOnly;
}

export function filterCards(cards: readonly Card[], { query, dueOnly, now }: CardFilter): Card[] {
  const needle = normalize(query.trim());
  return cards.filter(
    (card) =>
      (!dueOnly || isDue(card, now)) &&
      (needle === "" ||
        normalize(card.front).includes(needle) ||
        normalize(card.back).includes(needle)),
  );
}
