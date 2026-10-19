import { Link } from "react-router";
import { Check, Shuffle } from "lucide-react";
import type { ReviewExit } from "../../hooks/useReviewExit";
import type { MissedQuestion } from "../../hooks/useQuizSession";
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
      <h1 className={styles.title}>Quiz complete</h1>

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
                <p className={styles.question}>{item.prompt}</p>
                <p className={styles.answer}>
                  <Check size={16} className={styles.check} aria-hidden="true" />
                  <span className={styles.srOnly}>Correct answer: </span>
                  {item.answer}
                </p>
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
