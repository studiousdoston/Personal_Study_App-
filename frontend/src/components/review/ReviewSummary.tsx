import { Link } from "react-router";
import { Shuffle } from "lucide-react";
import type { ReviewExit } from "../../hooks/useReviewExit";
import type { SessionMode } from "../../hooks/useReviewSession";
import styles from "./ReviewSummary.module.css";

type ReviewSummaryProps = {
  mode: SessionMode;
  exit: ReviewExit;
  cards: number;
  practiceRepeats: number;
  remembered: number;
  rememberedPercent: number;
  onRestart?: () => void;
};

export function ReviewSummary({
  mode,
  exit,
  cards,
  practiceRepeats,
  remembered,
  rememberedPercent,
  onRestart,
}: ReviewSummaryProps) {
  const practice = mode === "practice";

  return (
    <main className={styles.summary}>
      <h1 className={styles.title}>{practice ? "Practice complete" : "Session complete"}</h1>
      {practice ? (
        <dl className={`${styles.stats} ${styles.single}`}>
          <div className={styles.stat}>
            <dt>remembered</dt>
            <dd>
              {remembered} / {cards}
            </dd>
          </div>
        </dl>
      ) : (
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
      )}
      {practice ? (
        <p className={styles.note}>Practice only — your schedule wasn't changed.</p>
      ) : (
        practiceRepeats > 0 && (
          <p className={styles.note}>
            Plus {practiceRepeats} practice {practiceRepeats === 1 ? "repeat" : "repeats"} of cards
            you rated Again. Those don't count toward your stats.
          </p>
        )
      )}
      <div className={styles.actions}>
        <Link to={exit.to} className={`${styles.button} ${styles.primary}`}>
          {exit.label}
        </Link>
        {practice ? (
          <button
            type="button"
            className={`${styles.button} ${styles.secondary}`}
            onClick={onRestart}
          >
            <Shuffle size={18} aria-hidden="true" />
            Practice again
          </button>
        ) : (
          <Link to="/" className={`${styles.button} ${styles.secondary}`}>
            Home
          </Link>
        )}
      </div>
    </main>
  );
}
