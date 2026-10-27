import type { Generation, GenerationCreate } from "../types/models";
import { api } from "./client";

export async function createGeneration(
  deckId: string,
  data: GenerationCreate,
): Promise<Generation> {
  const res = await api.post<Generation>(`/decks/${deckId}/generations`, data);
  return res.data;
}

export async function getGeneration(generationId: string): Promise<Generation> {
  const res = await api.get<Generation>(`/generations/${generationId}`);
  return res.data;
}

export async function refineGeneration(
  generationId: string,
  instructions: string | null,
): Promise<Generation> {
  const res = await api.post<Generation>(`/generations/${generationId}/refine`, { instructions });
  return res.data;
}
