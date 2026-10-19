import type { Card } from "../../types/models";
import styles from "./ReviewCard.module.css";

type ReviewCardProps = {
  card: Card;
  revealed: boolean;
  practice: boolean;
};

export function ReviewCard({ card, revealed, practice }: ReviewCardProps) {
  return (
    <article className={styles.card}>
      <div className={styles.labelRow}>
        <span className={styles.label}>Question</span>
        {practice && (
          <span className={styles.practice} title="Repeat for practice. This answer isn't saved.">
            Practice
          </span>
        )}
      </div>
      <p className={styles.front}>{card.front}</p>
      <div aria-live="polite">
        {revealed && (
          <>
            <hr className={styles.divider} />
            <span className={styles.label}>Answer</span>
            <p className={styles.back}>{card.back}</p>
          </>
        )}
      </div>
    </article>
  );
}
