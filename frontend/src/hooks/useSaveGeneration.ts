import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { saveGeneration } from "../services/generation.service";
import { plural } from "../utils/plural";
import type { FlashState } from "../utils/flashState";

export function useSaveGeneration(generationId: string) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: () => saveGeneration(generationId),
    onSuccess: (result) => {
      navigate(`/decks/${result.deck_id}`, {
        replace: true,
        state: { flash: `${plural(result.saved_count, "card")} added` } satisfies FlashState,
      });
      queryClient.removeQueries({ queryKey: ["generations", generationId], exact: true });
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: ["decks"] }),
        queryClient.invalidateQueries({ queryKey: ["stats"] }),
        queryClient.invalidateQueries({ queryKey: ["generations", "list"] }),
      ]);
    },
  });
}
