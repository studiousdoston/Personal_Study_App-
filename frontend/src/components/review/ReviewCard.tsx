import { useId } from "react";
import type { Card } from "../../types/models";
import styles from "./ReviewCard.module.css";

type ReviewCardProps = {
  card: Card;
  flipped: boolean;
  revealed: boolean;
  practice: boolean;
  onFlip: () => void;
};

export function ReviewCard({ card, flipped, revealed, practice, onFlip }: ReviewCardProps) {
  const questionId = useId();
  const answerId = useId();

  const labelRow = (label: string) => (
    <span className={styles.labelRow}>
      <span className={styles.label}>{label}</span>
      {practice && (
        <span className={styles.practice} title="Repeat for practice. This answer isn't saved.">
          Practice
        </span>
      )}
    </span>
  );

  return (
    <div>
      <button
        type="button"
        className={styles.scene}
        aria-label={flipped ? "Show question" : "Show answer"}
        aria-describedby={flipped ? answerId : questionId}
        onClick={onFlip}
      >
        <span className={`${styles.inner} ${flipped ? styles.flipped : ""}`}>
          <span className={`${styles.face} ${styles.frontFace}`} aria-hidden={flipped}>
            {labelRow("Question")}
            <span id={questionId} className={styles.front}>
              {card.front}
            </span>
            <span className={styles.hint}>
              <span className={styles.hintTouch}>
                {revealed ? "Tap to flip back" : "Tap to flip"}
              </span>
              <span className={styles.hintKeyboard}>
                {revealed ? "Click or press Space to flip back" : "Click or press Space"}
              </span>
            </span>
          </span>

          <span className={`${styles.face} ${styles.backFace}`} aria-hidden={!flipped}>
            {labelRow("Answer")}
            <span id={answerId} className={styles.back}>
              {card.back}
            </span>
          </span>
        </span>
      </button>

      <p className={styles.srOnly} aria-live="polite">
        {flipped ? `Answer: ${card.back}` : ""}
      </p>
    </div>
  );
}
