import { useEffect, useId, useRef, type MouseEvent } from "react";
import type { Card } from "../../types/models";
import { markdownToPlainText } from "../../utils/markdownToPlainText";
import { CardContent } from "../common/CardContent";
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
  const frontButton = useRef<HTMLButtonElement>(null);
  const backButton = useRef<HTMLButtonElement>(null);
  const moveFocus = useRef(false);

  useEffect(() => {
    if (!moveFocus.current) return;
    moveFocus.current = false;
    (flipped ? backButton : frontButton).current?.focus();
  }, [flipped]);

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

  const flipButton = (e: MouseEvent) => {
    e.stopPropagation();
    moveFocus.current = true;
    onFlip();
  };

  return (
    <div>
      <div className={styles.scene} onClick={onFlip}>
        <div className={`${styles.inner} ${flipped ? styles.flipped : ""}`}>
          <div className={`${styles.face} ${styles.frontFace}`} inert={flipped}>
            {labelRow("Question")}
            <div id={questionId} className={`${styles.body} ${styles.front}`}>
              <CardContent markdown={card.front} variant="full" />
            </div>
            <button
              ref={frontButton}
              type="button"
              className={styles.hint}
              aria-label="Show answer"
              aria-describedby={questionId}
              onClick={flipButton}
            >
              <span className={styles.hintTouch}>
                {revealed ? "Tap to flip back" : "Tap to flip"}
              </span>
              <span className={styles.hintKeyboard}>
                {revealed ? "Click or press Space to flip back" : "Click or press Space"}
              </span>
            </button>
          </div>

          <div className={`${styles.face} ${styles.backFace}`} inert={!flipped}>
            {labelRow("Answer")}
            <div id={answerId} className={`${styles.body} ${styles.back}`}>
              <CardContent markdown={card.back} variant="full" />
            </div>
            <button
              ref={backButton}
              type="button"
              className={styles.hint}
              aria-label="Show question"
              aria-describedby={answerId}
              onClick={flipButton}
            >
              <span className={styles.hintTouch}>Tap to flip back</span>
              <span className={styles.hintKeyboard}>Click or press Space to flip back</span>
            </button>
          </div>
        </div>
      </div>

      <p className={styles.srOnly} aria-live="polite">
        {flipped ? `Answer: ${markdownToPlainText(card.back)}` : ""}
      </p>
    </div>
  );
}
