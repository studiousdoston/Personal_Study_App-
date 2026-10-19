import type { Card, ReviewCreate } from "../types/models";
import { api } from "./client";

export const DUE_CARDS_LIMIT = 100;

export async function listDueCards(deckId: string): Promise<Card[]> {
  const res = await api.get<Card[]>(`/decks/${deckId}/due`, {
    params: { limit: DUE_CARDS_LIMIT },
  });
  return res.data;
}

export async function createReview(cardId: string, data: ReviewCreate): Promise<Card> {
  const res = await api.post<Card>(`/cards/${cardId}/reviews`, data);
  return res.data;
}
