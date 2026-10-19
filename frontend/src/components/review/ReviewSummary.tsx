import { Link } from "react-router";
import type { ReviewExit } from "../../hooks/useReviewExit";
import styles from "./ReviewSummary.module.css";

type ReviewSummaryProps = {
  exit: ReviewExit;
  cards: number;
  practiceRepeats: number;
  rememberedPercent: number;
};

export function ReviewSummary({
  exit,
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
        <Link to={exit.to} className={`${styles.button} ${styles.primary}`}>
          {exit.label}
        </Link>
        <Link to="/" className={`${styles.button} ${styles.secondary}`}>
          Home
        </Link>
      </div>
    </main>
  );
}
