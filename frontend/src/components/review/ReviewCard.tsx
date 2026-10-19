import type { Card } from "../../types/models";
import styles from "./ReviewCard.module.css";

export function ReviewCard({ card, revealed }: { card: Card; revealed: boolean }) {
  return (
    <article className={styles.card}>
      <span className={styles.label}>Question</span>
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
