import { useEffect, useEffectEvent } from "react";
import type { ReviewExit } from "../../hooks/useReviewExit";
import { RATING_KEYS, type SessionMode, useReviewSession } from "../../hooks/useReviewSession";
import { getErrorMessage } from "../../services/errors";
import type { Card } from "../../types/models";
import { ErrorBox } from "../common/ErrorBox";
import { RatingButtons } from "./RatingButtons";
import { ReviewCard } from "./ReviewCard";
import { ReviewSummary } from "./ReviewSummary";
import { ReviewTopBar } from "./ReviewTopBar";
import styles from "./ReviewSession.module.css";

type ReviewSessionProps = {
  exit: ReviewExit;
  deckName?: string;
  cards: Card[];
  mode?: SessionMode;
  onRestart?: () => void;
};

function isTypingTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)
  );
}

function isActivatable(target: EventTarget | null) {
  return target instanceof HTMLElement && target.closest("button, a") !== null;
}

export function ReviewSession({
  exit,
  deckName,
  cards,
  mode = "review",
  onRestart,
}: ReviewSessionProps) {
  const session = useReviewSession(cards, mode);
  const practice = mode === "practice";

  const onKeyDown = useEffectEvent((e: KeyboardEvent) => {
    if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
    if (isTypingTarget(e.target) || session.finished) return;

    if (e.key === " " || e.key === "Enter") {
      if (isActivatable(e.target)) return;
      e.preventDefault();
      session.flip();
      return;
    }

    const rating = RATING_KEYS[e.key];
    if (rating !== undefined && session.revealed && !session.isPending) {
      e.preventDefault();
      session.rate(rating);
    }
  });

  useEffect(() => {
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  if (session.finished) {
    return (
      <div className={styles.page}>
        <ReviewTopBar
          exitTo={exit.to}
          deckName={deckName}
          progress={session.progress}
          practice={practice}
        />
        <ReviewSummary mode={mode} exit={exit} onRestart={onRestart} {...session.summary} />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <ReviewTopBar
        exitTo={exit.to}
        deckName={deckName}
        progress={session.progress}
        practice={practice}
      />

      <main className={styles.stage}>
        <ReviewCard
          key={session.progress.done}
          card={session.current!}
          flipped={session.flipped}
          revealed={session.revealed}
          practice={session.isPractice}
          onFlip={session.flip}
        />
        {session.error && (
          <ErrorBox message={getErrorMessage(session.error)} onRetry={session.retry} />
        )}
      </main>

      <div className={styles.controls}>
        <div
          className={`${styles.ratings} ${session.revealed ? "" : styles.waiting}`}
          inert={!session.revealed}
        >
          <RatingButtons onRate={session.rate} disabled={session.isPending} />
        </div>
        <p className={styles.hint}>
          <kbd>Space</kbd> flip · <kbd>1</kbd> Again · <kbd>2</kbd> Hard · <kbd>3</kbd> Good ·{" "}
          <kbd>4</kbd> Easy
        </p>
      </div>
    </div>
  );
}
