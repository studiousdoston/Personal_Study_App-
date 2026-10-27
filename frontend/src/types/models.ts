import type { components } from "./api";

export type User = components["schemas"]["UserOut"];
export type TokenResponse = components["schemas"]["TokenResponse"];
export type RegistrationStatus = components["schemas"]["RegistrationStatusOut"];
export type Deck = components["schemas"]["DeckOut"];
export type Card = components["schemas"]["CardOut"];
export type Stats = components["schemas"]["StatsOut"];
type DeckCreateSchema = components["schemas"]["DeckCreate"];
export type DeckCreate = Omit<DeckCreateSchema, "color" | "icon"> &
  Partial<Pick<DeckCreateSchema, "color" | "icon">>;
export type CardCreate = components["schemas"]["CardCreate"];
export type CardUpdate = components["schemas"]["CardUpdate"];
export type DeckUpdate = components["schemas"]["DeckUpdate"];
export type ReviewCreate = components["schemas"]["ReviewCreate"];
export type Quiz = components["schemas"]["QuizOut"];
export type QuizQuestion = components["schemas"]["QuizQuestion"];
