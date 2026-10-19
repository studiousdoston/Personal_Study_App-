import { useDeck } from "../../hooks/useDeck";
import { useDueCards } from "../../hooks/useDueCards";
import { getErrorMessage, isNotFoundError } from "../../services/errors";
import { ErrorBox } from "../common/ErrorBox";
import { DeckNotFound } from "../deck/DeckNotFound";
import { ReviewEmpty } from "./ReviewEmpty";
import { ReviewSession } from "./ReviewSession";
import { ReviewTopBar } from "./ReviewTopBar";
import styles from "./ReviewView.module.css";

export function ReviewView({ deckId }: { deckId: string }) {
  const deck = useDeck(deckId);
  const due = useDueCards(deckId);

  if (
    (due.isError && isNotFoundError(due.error)) ||
    (deck.isError && isNotFoundError(deck.error))
  ) {
    return (
      <div className={styles.page}>
        <DeckNotFound />
      </div>
    );
  }

  if (due.isSuccess && due.data.length > 0) {
    return <ReviewSession deckId={deckId} deckName={deck.data?.name} cards={due.data} />;
  }

  return (
    <div className={styles.page}>
      <ReviewTopBar deckId={deckId} deckName={deck.data?.name} />
      {due.isPending ? (
        <div className={styles.skeleton} aria-hidden="true" />
      ) : due.isError ? (
        <ErrorBox message={getErrorMessage(due.error)} onRetry={() => due.refetch()} />
      ) : (
        <ReviewEmpty deckId={deckId} />
      )}
    </div>
  );
}
