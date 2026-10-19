import { Link } from "react-router";
import { Play } from "lucide-react";
import { useDecks } from "../../hooks/useDecks";
import { REVIEW_PICKER_PATH } from "../../hooks/useReviewExit";
import { getErrorMessage } from "../../services/errors";
import { ErrorBox } from "../common/ErrorBox";
import { ReviewPickerRow } from "./ReviewPickerRow";
import styles from "./ReviewPicker.module.css";

function plural(count: number, word: string) {
  return `${word}${count === 1 ? "" : "s"}`;
}

export function ReviewPicker() {
  const { data: decks, isPending, isError, error, refetch } = useDecks();

  const dueDecks = (decks ?? [])
    .filter((deck) => deck.due_count > 0)
    .sort((a, b) => b.due_count - a.due_count);
  const totalDue = dueDecks.reduce((sum, deck) => sum + deck.due_count, 0);
  const top = dueDecks[0];

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Review</h1>
        {decks && dueDecks.length > 0 && (
          <p className={styles.subtitle}>
            <span className={styles.highlight}>{totalDue}</span> {plural(totalDue, "card")} due
            across {dueDecks.length} {plural(dueDecks.length, "deck")}
          </p>
        )}
      </header>

      {isPending ? (
        <ul className={styles.list} aria-busy="true">
          {Array.from({ length: 3 }, (_, i) => (
            <li key={i} className={styles.skeleton} />
          ))}
        </ul>
      ) : isError ? (
        <ErrorBox message={getErrorMessage(error)} onRetry={() => refetch()} />
      ) : dueDecks.length === 0 ? (
        <div className={styles.empty}>
          <h2 className={styles.emptyTitle}>All caught up 🎉</h2>
          <p>Come back tomorrow, or practice a deck.</p>
          <Link to="/" className={styles.primary}>
            Go to decks
          </Link>
        </div>
      ) : (
        <>
          {dueDecks.length > 1 && (
            <Link
              to={`/decks/${top.id}/review`}
              state={{ from: REVIEW_PICKER_PATH }}
              className={`${styles.primary} ${styles.start}`}
            >
              <Play size={18} aria-hidden="true" />
              <span className={styles.startText}>Start with {top.name}</span>
            </Link>
          )}
          <ul className={styles.list}>
            {dueDecks.map((deck) => (
              <ReviewPickerRow key={deck.id} deck={deck} />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
