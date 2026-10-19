import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createCard } from "../services/card.service";
import type { CardCreate } from "../types/models";

export function useCreateCard(deckId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CardCreate) => createCard(deckId, data),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ["decks"] }),
        queryClient.invalidateQueries({ queryKey: ["stats"] }),
      ]),
  });
}
