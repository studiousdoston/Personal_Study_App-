import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateDraft } from "../services/generation.service";
import type { CardDraft, DraftUpdate, Generation } from "../types/models";

type Variables = { draftId: string; data: DraftUpdate };

export function useUpdateDraft(generationId: string) {
  const queryClient = useQueryClient();
  const queryKey = ["generations", generationId];

  function replaceDraft(draftId: string, change: (draft: CardDraft) => CardDraft) {
    queryClient.setQueryData<Generation>(
      queryKey,
      (job) =>
        job && {
          ...job,
          drafts: job.drafts.map((draft) => (draft.id === draftId ? change(draft) : draft)),
        },
    );
  }

  return useMutation({
    mutationFn: ({ draftId, data }: Variables) => updateDraft(draftId, data),
    onMutate: async ({ draftId, data }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient
        .getQueryData<Generation>(queryKey)
        ?.drafts.find((draft) => draft.id === draftId);
      const textChanged =
        (data.front != null && data.front !== previous?.front) ||
        (data.back != null && data.back !== previous?.back);
      replaceDraft(
        draftId,
        (draft) =>
          ({
            ...draft,
            ...data,
            edited: draft.edited || textChanged,
          }) as CardDraft,
      );
      return { previous };
    },
    onError: (_err, { draftId }, context) => {
      const previous = context?.previous;
      if (previous) replaceDraft(draftId, () => previous);
    },
    onSuccess: (saved) => replaceDraft(saved.id, () => saved),
  });
}
