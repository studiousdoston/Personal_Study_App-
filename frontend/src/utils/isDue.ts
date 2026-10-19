import type { Card } from "../types/models";

export function isDue(card: Card, now: number): boolean {
  return new Date(card.next_review_at).getTime() <= now;
}
