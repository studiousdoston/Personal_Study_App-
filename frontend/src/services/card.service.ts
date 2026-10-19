import type { Card } from "../types/models";
import { api } from "./client";

export async function listCards(deckId: string): Promise<Card[]> {
  const res = await api.get<Card[]>(`/deck/${deckId}/cards`);
  return res.data;
}


