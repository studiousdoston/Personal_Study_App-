import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateCard } from "../services/card.service";
import type { CardUpdate } from "../types/models";

export function useUpdateCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ cardId, data }: { cardId: string; data: CardUpdate }) =>
      updateCard(cardId, data),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ["decks"] }),
        queryClient.invalidateQueries({ queryKey: ["stats"] }),
      ]),
  });
}
