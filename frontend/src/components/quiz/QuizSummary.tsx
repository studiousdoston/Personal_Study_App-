import { Link } from "react-router";
import { Check, Shuffle } from "lucide-react";
import type { ReviewExit } from "../../hooks/useReviewExit";
import type { MissedQuestion } from "../../hooks/useQuizSession";
import { CardContent } from "../common/CardContent";
import { ResultHeading } from "../common/ResultHeading";
import styles from "./QuizSummary.module.css";

type QuizSummaryProps = {
  exit: ReviewExit;
  correct: number;
  total: number;
  percent: number;
  missed: MissedQuestion[];
  onRestart: () => void;
};

export function QuizSummary({
  exit,
  correct,
  total,
  percent,
  missed,
  onRestart,
}: QuizSummaryProps) {
  return (
    <main className={styles.summary}>
      <ResultHeading title="Quiz complete" correct={correct} total={total} />

      <div className={styles.score}>
        <p className={styles.points}>
          {correct} / {total}
        </p>
        <p className={styles.percent}>{percent}% correct</p>
      </div>

      {missed.length > 0 ? (
        <section className={styles.missed} aria-labelledby="quiz-missed-title">
          <h2 id="quiz-missed-title" className={styles.missedTitle}>
            Review these
          </h2>
          <ul className={styles.list}>
            {missed.map((item) => (
              <li key={item.cardId} className={styles.item}>
                <div className={styles.question}>
                  <CardContent markdown={item.prompt} variant="compact" />
                </div>
                <div className={styles.answer}>
                  <Check size={16} className={styles.check} aria-hidden="true" />
                  <span className={styles.srOnly}>Correct answer: </span>
                  <CardContent markdown={item.answer} variant="compact" />
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <p className={styles.perfect}>No misses. Nice work!</p>
      )}

      <p className={styles.note}>Practice only — your schedule wasn't changed.</p>

      <div className={styles.actions}>
        <Link to={exit.to} className={`${styles.button} ${styles.primary}`}>
          {exit.label}
        </Link>
        <button
          type="button"
          className={`${styles.button} ${styles.secondary}`}
          onClick={onRestart}
        >
          <Shuffle size={18} aria-hidden="true" />
          Quiz again
        </button>
      </div>
    </main>
  );
}
