import { useMutation } from "@tanstack/react-query";
import { createReview } from "../services/review.service";
import type { ReviewCreate } from "../types/models";

export function useCreateReview() {
  return useMutation({
    mutationFn: ({ cardId, data }: { cardId: string; data: ReviewCreate }) =>
      createReview(cardId, data),
  });
}
