import { Link } from "react-router";
import styles from "./ReviewSummary.module.css";

type ReviewSummaryProps = {
  deckId: string;
  cards: number;
  practiceRepeats: number;
  rememberedPercent: number;
};

export function ReviewSummary({
  deckId,
  cards,
  practiceRepeats,
  rememberedPercent,
}: ReviewSummaryProps) {
  return (
    <main className={styles.summary}>
      <h1 className={styles.title}>Session complete</h1>
      <dl className={styles.stats}>
        <div className={styles.stat}>
          <dt>Cards reviewed</dt>
          <dd>{cards}</dd>
        </div>
        <div className={styles.stat}>
          <dt>Remembered</dt>
          <dd>{rememberedPercent}%</dd>
        </div>
      </dl>
      {practiceRepeats > 0 && (
        <p className={styles.note}>
          Plus {practiceRepeats} practice {practiceRepeats === 1 ? "repeat" : "repeats"} of cards
          you rated Again. Those don't count toward your stats.
        </p>
      )}
      <div className={styles.actions}>
        <Link to={`/decks/${deckId}`} className={`${styles.button} ${styles.primary}`}>
          Back to deck
        </Link>
        <Link to="/" className={`${styles.button} ${styles.secondary}`}>
          Home
        </Link>
      </div>
    </main>
  );
}
