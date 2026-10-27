import type {
  CardDraft,
  DraftUpdate,
  Generation,
  GenerationCreate,
  GenerationSummary,
  SaveResult,
} from "../types/models";
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

export async function listGenerations(): Promise<GenerationSummary[]> {
  const res = await api.get<GenerationSummary[]>("/generations");
  return res.data;
}

export async function saveGeneration(generationId: string): Promise<SaveResult> {
  const res = await api.post<SaveResult>(`/generations/${generationId}/save`);
  return res.data;
}

export async function deleteGeneration(generationId: string): Promise<void> {
  await api.delete(`/generations/${generationId}`);
}

export async function updateDraft(draftId: string, data: DraftUpdate): Promise<CardDraft> {
  const res = await api.patch<CardDraft>(`/drafts/${draftId}`, data);
  return res.data;
}

export async function deleteDraft(draftId: string): Promise<void> {
  await api.delete(`/drafts/${draftId}`);
}
