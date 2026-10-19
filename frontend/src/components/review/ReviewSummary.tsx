import { Link } from "react-router";
import styles from "./ReviewSummary.module.css";

type ReviewSummaryProps = {
  deckId: string;
  cards: number;
  answers: number;
  rememberedPercent: number;
};

export function ReviewSummary({ deckId, cards, answers, rememberedPercent }: ReviewSummaryProps) {
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
      {answers > cards && (
        <p className={styles.note}>
          {answers} answers in total, because cards rated Again came back once more.
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
