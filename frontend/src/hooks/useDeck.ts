import { useQuery } from "@tanstack/react-query";
import { getDeck } from "../services/deck.service";

export function useDeck(deckId: string) {
  return useQuery({
    queryKey: ["decks"],
    queryFn: () => getDeck(deckId),
  });
}
