import type { Deck, DeckCreate } from "../types/models";
import { api } from "./client";

export async function listDecks(): Promise<Deck[]> {
  const res = await api.get<Deck[]>("/decks");
  return res.data;
}

export async function createDeck(data: DeckCreate): Promise<Deck> {
  const res = await api.post<Deck>("/decks", data);
  return res.data;
}

// get, update and delete come later, when the deck page needs them.
