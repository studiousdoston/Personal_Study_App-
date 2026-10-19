import { useState } from "react";
import { useCards } from "../../hooks/useCards";
import { useDeck } from "../../hooks/useDeck";
import type { ReviewExit } from "../../hooks/useReviewExit";
import { getErrorMessage, isNotFoundError } from "../../services/errors";
import { ErrorBox } from "../common/ErrorBox";
import { DeckNotFound } from "../deck/DeckNotFound";
import { ReviewEmpty } from "./ReviewEmpty";
import { ReviewSession } from "./ReviewSession";
import { ReviewTopBar } from "./ReviewTopBar";
import styles from "./PracticeView.module.css";

export function PracticeView({ deckId }: { deckId: string }) {
  const deck = useDeck(deckId);
  const cards = useCards(deckId);
  const [run, setRun] = useState(0);
  const exit: ReviewExit = { to: `/decks/${deckId}`, label: "Back to deck" };

  if (
    (cards.isError && isNotFoundError(cards.error)) ||
    (deck.isError && isNotFoundError(deck.error))
  ) {
    return (
      <div className={styles.page}>
        <DeckNotFound />
      </div>
    );
  }

  if (cards.data && cards.data.length > 0) {
    return (
      <ReviewSession
        key={run}
        mode="practice"
        exit={exit}
        deckName={deck.data?.name}
        cards={cards.data}
        onRestart={() => setRun((prev) => prev + 1)}
      />
    );
  }

  return (
    <div className={styles.page}>
      <ReviewTopBar exitTo={exit.to} deckName={deck.data?.name} practice />
      {cards.isPending ? (
        <div className={styles.skeleton} aria-hidden="true" />
      ) : cards.isError ? (
        <ErrorBox message={getErrorMessage(cards.error)} onRetry={() => cards.refetch()} />
      ) : (
        <ReviewEmpty deckId={deckId} mode="practice" />
      )}
    </div>
  );
}
