import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createGeneration } from "../services/generation.service";
import type { GenerationCreate } from "../types/models";

export function useCreateGeneration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ deckId, data }: { deckId: string; data: GenerationCreate }) =>
      createGeneration(deckId, data),
    onSuccess: (generation) => {
      queryClient.setQueryData(["generations", generation.id], generation);
      return queryClient.invalidateQueries({ queryKey: ["generations", "list"] });
    },
  });
}
