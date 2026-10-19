import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { deleteDeck } from "../services/deck.service";
import type { Deck } from "../types/models";

export function useDeleteDeck() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: deleteDeck,
    onSuccess: (_data, deckId) => {
      navigate("/", { replace: true });
      queryClient.removeQueries({ queryKey: ["decks", deckId] });
      queryClient.setQueryData<Deck[]>(["decks"], (decks) =>
        decks?.filter((deck) => deck.id !== deckId),
      );
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: ["decks"] }),
        queryClient.invalidateQueries({ queryKey: ["stats"] }),
      ]);
    },
  });
}
