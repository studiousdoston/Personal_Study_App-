import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createDeck } from "../services/deck.service";

export function useCreateDeck() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createDeck,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["decks"] }),
  });
}
