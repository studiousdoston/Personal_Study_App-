import { useMutation, useQueryClient } from "@tanstack/react-query";
import { refineGeneration } from "../services/generation.service";

export function useRefineGeneration(generationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (instructions: string | null) => refineGeneration(generationId, instructions),
    onSuccess: (generation) => queryClient.setQueryData(["generations", generationId], generation),
  });
}
