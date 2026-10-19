import { useQuery } from "@tanstack/react-query";
import { listCards } from "../services/card.service";

export function useCards(deckId: string) {
  return useQuery({
    queryKey: ["deck", deckId, "cards"],
    queryFn: () => listCards(deckId),
  });
}
