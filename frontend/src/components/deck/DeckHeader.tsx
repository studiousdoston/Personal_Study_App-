import { ListChecks, Play } from "lucide-react";
import styles from "../../pages/DeckPage.module.css";
import type { Deck } from "../../types/models";
import { Link } from "react-router";

export const QUIZ_MIN_CARDS = 4;

export function DeckHeader({ deck }: { deck: Deck }) {
  const canStudy = deck.due_count > 0;
  const canQuiz = deck.card_count >= QUIZ_MIN_CARDS;

  return (
    <section className={styles.header}>
      <h1 className={styles.title}>{deck.name}</h1>
      {deck.description && <p className={styles.description}>{deck.description}</p>}

      <ul className={styles.chips}>
        <li className={`${styles.chip} ${canStudy ? styles.chipDue : ""}`}>
          <strong>{deck.due_count}</strong> due
        </li>
        <li className={styles.chip}>
          <strong>{deck.card_count}</strong> {deck.card_count === 1 ? "card" : "cards"}
        </li>
        <li className={styles.chip}>
          Mastery <strong>{deck.mastery}%</strong>
        </li>
      </ul>

      <div className={styles.actions}>
        {canStudy ? (
          <Link to={`/decks/${deck.id}/review`} className={`${styles.button} ${styles.primary}`}>
            <Play size={18} aria-hidden="true" />
            Study
          </Link>
        ) : (
          <span
            className={`${styles.button} ${styles.primary} ${styles.disabled}`}
            aria-disabled="true"
          >
            <Play size={18} aria-hidden="true" />
            Nothing due
          </span>
        )}

        {canQuiz ? (
          <Link to={`/decks/${deck.id}/quiz`} className={`${styles.button} ${styles.secondary}`}>
            <ListChecks size={18} aria-hidden="true" />
            Quiz me
          </Link>
        ) : (
          <span
            className={`${styles.button} ${styles.secondary} ${styles.disabled}`}
            aria-disabled="true"
          >
            <ListChecks size={18} aria-hidden="true" />
            Quiz needs {QUIZ_MIN_CARDS}+ cards
          </span>
        )}
      </div>
    </section>
  );
}
