import { useQuery } from "@tanstack/react-query";
import { getDeck } from "../services/deck.service";
import { isNotFoundError } from "../services/errors";

export function useDeck(deckId: string) {
  return useQuery({
    queryKey: ["decks", deckId],
    queryFn: () => getDeck(deckId),
    retry: (failureCount, error) => !isNotFoundError(error) && failureCount < 1,
  });
}
