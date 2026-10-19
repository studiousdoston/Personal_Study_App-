import type { components } from "./api";

export type User = components["schemas"]["UserOut"];
export type TokenResponse = components["schemas"]["TokenResponse"];
export type Deck = components["schemas"]["DeckOut"];
export type Card = components["schemas"]["CardOut"];
export type Stats = components["schemas"]["StatsOut"];
export type DeckCreate = components["schemas"]["DeckCreate"];
export type CardCreate = components["schemas"]["CardCreate"];
export type CardUpdate = components["schemas"]["CardUpdate"];
export type DeckUpdate = components["schemas"]["DeckUpdate"];
