import type { Deck, DeckCreate, DeckUpdate } from "../types/models";
import { api } from "./client";

export async function listDecks(): Promise<Deck[]> {
  const res = await api.get<Deck[]>("/decks");
  return res.data;
}

export async function createDeck(data: DeckCreate): Promise<Deck> {
  const res = await api.post<Deck>("/decks", data);
  return res.data;
}

export async function getDeck(deckId: string): Promise<Deck> {
  const res = await api.get<Deck>(`/decks/${deckId}`);
  return res.data;
}

export async function updateDeck(deckId: string, data: DeckUpdate): Promise<Deck> {
  const res = await api.patch<Deck>(`/decks/${deckId}`, data);
  return res.data;
}

export async function deleteDeck(deckId: string): Promise<void> {
  await api.delete(`/decks/${deckId}`);
}
