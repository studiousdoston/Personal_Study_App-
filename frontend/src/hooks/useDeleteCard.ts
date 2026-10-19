import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteCard } from "../services/card.service";

export function useDeleteCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteCard,
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ["decks"] }),
        queryClient.invalidateQueries({ queryKey: ["stats"] }),
      ]),
  });
}
