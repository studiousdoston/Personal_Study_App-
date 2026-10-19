import { useQuery } from "@tanstack/react-query";
import { listDueCards } from "../services/review.service";
import { isNotFoundError } from "../services/errors";

export function useDueCards(deckId: string) {
  return useQuery({
    queryKey: ["review", deckId],
    queryFn: () => listDueCards(deckId),
    staleTime: Infinity,
    gcTime: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: (failureCount, error) => !isNotFoundError(error) && failureCount < 1,
  });
}
