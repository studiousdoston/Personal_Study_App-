import { useEffect, useEffectEvent, useRef } from "react";
import type { ReviewExit } from "../../hooks/useReviewExit";
import { OPTION_KEYS, useQuizSession } from "../../hooks/useQuizSession";
import type { QuizQuestion } from "../../types/models";
import { isActivatable, isTypingTarget } from "../../utils/keyboard";
import { ReviewTopBar } from "../review/ReviewTopBar";
import { QuizOptions } from "./QuizOptions";
import { QuizPrompt } from "./QuizPrompt";
import { QuizSummary } from "./QuizSummary";
import styles from "./QuizSession.module.css";

type QuizSessionProps = {
  exit: ReviewExit;
  deckName?: string;
  questions: QuizQuestion[];
  onRestart: () => void;
};

export function QuizSession({ exit, deckName, questions, onRestart }: QuizSessionProps) {
  const session = useQuizSession(questions);
  const nextRef = useRef<HTMLButtonElement>(null);

  const onKeyDown = useEffectEvent((e: KeyboardEvent) => {
    if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
    if (isTypingTarget(e.target) || session.finished) return;

    if (e.key === " " || e.key === "Enter") {
      if (!session.answered || isActivatable(e.target)) return;
      e.preventDefault();
      session.next();
      return;
    }

    const index = OPTION_KEYS.indexOf(e.key);
    if (index !== -1 && !session.answered && session.current?.options[index]) {
      e.preventDefault();
      session.pick(index);
    }
  });

  useEffect(() => {
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (session.answered) nextRef.current?.focus();
  }, [session.answered]);

  const topBar = (
    <ReviewTopBar exitTo={exit.to} deckName={deckName} progress={session.progress} badge="Quiz" />
  );

  if (session.finished) {
    return (
      <div className={styles.page}>
        {topBar}
        <QuizSummary exit={exit} onRestart={onRestart} {...session.summary} />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {topBar}

      <main className={styles.stage}>
        <QuizPrompt prompt={session.current!.prompt} />
        <QuizOptions
          options={session.current!.options}
          chosen={session.chosen}
          onPick={session.pick}
        />
        <p className={styles.srOnly} aria-live="polite">
          {session.answered
            ? session.answeredCorrectly
              ? "Correct."
              : `Wrong. The answer is ${session.correctAnswer}.`
            : ""}
        </p>
      </main>

      <div className={styles.controls}>
        <div className={session.answered ? "" : styles.waiting} inert={!session.answered}>
          <button ref={nextRef} type="button" className={styles.next} onClick={session.next}>
            {session.isLast ? "See results" : "Next"}
          </button>
        </div>
        <p className={styles.hint}>
          <kbd>1</kbd>–<kbd>4</kbd> choose · <kbd>Enter</kbd> next
        </p>
      </div>
    </div>
  );
}
