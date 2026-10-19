import type { Quiz } from "../types/models";
import { api } from "./client";

export const QUIZ_QUESTION_COUNT = 10;

export async function getQuiz(deckId: string, count: number): Promise<Quiz> {
  const res = await api.get<Quiz>(`/decks/${deckId}/quiz`, { params: { count } });
  return res.data;
}
