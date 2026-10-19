import type { Card, CardCreate, CardUpdate } from "../types/models";
import { api } from "./client";

export async function listCards(deckId: string): Promise<Card[]> {
  const res = await api.get<Card[]>(`/decks/${deckId}/cards`);
  return res.data;
}

export async function createCard(deckId: string, data: CardCreate): Promise<Card> {
  const res = await api.post<Card>(`/decks/${deckId}/cards`, data);
  return res.data;
}

export async function updateCard(cardId: string, data: CardUpdate): Promise<Card> {
  const res = await api.patch<Card>(`/cards/${cardId}`, data);
  return res.data;
}
