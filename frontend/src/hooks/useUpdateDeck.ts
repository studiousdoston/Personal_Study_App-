import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateDeck } from "../services/deck.service";
import type { DeckUpdate } from "../types/models";

export function useUpdateDeck() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ deckId, data }: { deckId: string; data: DeckUpdate }) =>
      updateDeck(deckId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["decks"] }),
  });
}
