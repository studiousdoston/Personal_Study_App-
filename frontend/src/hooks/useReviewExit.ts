import { useLocation } from "react-router";

export const REVIEW_PICKER_PATH = "/review";

export type ReviewExit = { to: string; label: string };

function cameFromPicker(state: unknown) {
  return (
    typeof state === "object" &&
    state !== null &&
    "from" in state &&
    state.from === REVIEW_PICKER_PATH
  );
}

export function useReviewExit(deckId: string): ReviewExit {
  const { state } = useLocation();
  return cameFromPicker(state)
    ? { to: REVIEW_PICKER_PATH, label: "Back to review" }
    : { to: `/decks/${deckId}`, label: "Back to deck" };
}
