import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteDraft } from "../services/generation.service";
import type { Generation } from "../types/models";

export function useDeleteDraft(generationId: string) {
  const queryClient = useQueryClient();
  const queryKey = ["generations", generationId];

  return useMutation({
    mutationFn: deleteDraft,
    onMutate: async (draftId: string) => {
      await queryClient.cancelQueries({ queryKey });
      const removed = queryClient
        .getQueryData<Generation>(queryKey)
        ?.drafts.find((draft) => draft.id === draftId);
      queryClient.setQueryData<Generation>(
        queryKey,
        (job) => job && { ...job, drafts: job.drafts.filter((draft) => draft.id !== draftId) },
      );
      return { removed };
    },
    onError: (_err, _draftId, context) => {
      const removed = context?.removed;
      if (!removed) return;
      queryClient.setQueryData<Generation>(
        queryKey,
        (job) =>
          job && {
            ...job,
            drafts: [...job.drafts, removed].sort((a, b) => a.position - b.position),
          },
      );
    },
  });
}
