import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { deleteGeneration } from "../services/generation.service";

export function useDeleteGeneration(generationId: string, deckId: string) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: () => deleteGeneration(generationId),
    onSuccess: () => {
      navigate(`/decks/${deckId}`, { replace: true });
      queryClient.removeQueries({ queryKey: ["generations", generationId], exact: true });
      return queryClient.invalidateQueries({ queryKey: ["generations", "list"] });
    },
  });
}
