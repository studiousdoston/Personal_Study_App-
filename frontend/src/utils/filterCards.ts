import type { Card } from "../types/models";
import { isDue } from "./isDue";
import { markdownToPlainText } from "./markdownToPlainText";

export type CardFilter = {
  query: string;
  dueOnly: boolean;
  now: number;
};

const searchTextCache = new WeakMap<Card, string>();

function normalize(text: string): string {
  return text.normalize("NFC").toLowerCase();
}

function searchText(card: Card): string {
  let text = searchTextCache.get(card);
  if (text === undefined) {
    text = normalize(`${markdownToPlainText(card.front)}\n${markdownToPlainText(card.back)}`);
    searchTextCache.set(card, text);
  }
  return text;
}

export function isFilterActive({ query, dueOnly }: Pick<CardFilter, "query" | "dueOnly">): boolean {
  return query.trim() !== "" || dueOnly;
}

export function filterCards(cards: readonly Card[], { query, dueOnly, now }: CardFilter): Card[] {
  const needle = normalize(query.trim());
  return cards.filter(
    (card) =>
      (!dueOnly || isDue(card, now)) && (needle === "" || searchText(card).includes(needle)),
  );
}
