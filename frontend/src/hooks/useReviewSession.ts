import { useEffect, useRef, useState } from "react";
import { type QueryClient, useQueryClient } from "@tanstack/react-query";
import { useCreateReview } from "./useCreateReview";
import type { Card } from "../types/models";

export type Rating = 1 | 3 | 4 | 5;

export const AGAIN: Rating = 1;
export const RATING_KEYS: Record<string, Rating> = { "1": 1, "2": 3, "3": 4, "4": 5 };
export const REMEMBERED_MIN_RATING = 3;
const MAX_TIME_TAKEN_MS = 3_600_000;

type QueueItem = { card: Card; practice: boolean };

function refreshCounts(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: ["decks"] });
  queryClient.invalidateQueries({ queryKey: ["stats"] });
}

export function useReviewSession(initialCards: Card[]) {
  const queryClient = useQueryClient();
  const mutation = useCreateReview();
  const [queue, setQueue] = useState<QueueItem[]>(() =>
    initialCards.map((card) => ({ card, practice: false })),
  );
  const [position, setPosition] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [firstRatings, setFirstRatings] = useState<Rating[]>([]);
  const [practiceRepeats, setPracticeRepeats] = useState(0);
  const [failedRating, setFailedRating] = useState<Rating | null>(null);
  const shownAt = useRef(0);
  const needsRefresh = useRef(false);

  const current = queue[position] as QueueItem | undefined;
  const finished = current === undefined;

  useEffect(() => {
    shownAt.current = Date.now();
  }, [position]);

  useEffect(() => {
    if (!finished || !needsRefresh.current) return;
    needsRefresh.current = false;
    refreshCounts(queryClient);
  }, [finished, queryClient]);

  useEffect(() => {
    return () => {
      if (!needsRefresh.current) return;
      needsRefresh.current = false;
      refreshCounts(queryClient);
    };
  }, [queryClient]);

  function flip() {
    if (finished) return;
    if (!flipped) setRevealed(true);
    setFlipped(!flipped);
  }

  function next(item: QueueItem, rating: Rating) {
    if (rating === AGAIN) setQueue((prev) => [...prev, { card: item.card, practice: true }]);
    setPosition((prev) => prev + 1);
    setFlipped(false);
    setRevealed(false);
  }

  function rate(rating: Rating) {
    if (!current || !revealed || mutation.isPending) return;
    if (current.practice) {
      setPracticeRepeats((prev) => prev + 1);
      next(current, rating);
      return;
    }
    const timeTaken = Math.min(Date.now() - shownAt.current, MAX_TIME_TAKEN_MS);
    setFailedRating(null);
    mutation.mutate(
      { cardId: current.card.id, data: { rating, time_taken_ms: timeTaken } },
      {
        onSuccess: () => {
          needsRefresh.current = true;
          setFirstRatings((prev) => [...prev, rating]);
          next(current, rating);
          mutation.reset();
        },
        onError: () => setFailedRating(rating),
      },
    );
  }

  function retry() {
    if (failedRating !== null) rate(failedRating);
  }

  const remembered = firstRatings.filter((r) => r >= REMEMBERED_MIN_RATING).length;

  return {
    current: current?.card,
    isPractice: current?.practice ?? false,
    finished,
    flipped,
    revealed,
    flip,
    rate,
    retry,
    isPending: mutation.isPending,
    error: mutation.isError ? mutation.error : null,
    progress: { done: position, total: queue.length },
    summary: {
      cards: initialCards.length,
      practiceRepeats,
      rememberedPercent:
        initialCards.length === 0 ? 0 : Math.round((remembered / initialCards.length) * 100),
    },
  };
}
