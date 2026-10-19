import { useQuery } from "@tanstack/react-query";
import { listCards } from "../services/card.service";

export function useCards(deckId: string) {
  return useQuery({
    queryKey: ["decks", deckId, "cards"],
    queryFn: () => listCards(deckId),
  });
}
