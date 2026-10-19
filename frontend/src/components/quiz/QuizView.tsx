import { useState } from "react";
import { QUIZ_MIN_CARDS } from "../../constants";
import { useDeck } from "../../hooks/useDeck";
import { useQuiz } from "../../hooks/useQuiz";
import type { ReviewExit } from "../../hooks/useReviewExit";
import { getErrorMessage, isNotEnoughCardsError, isNotFoundError } from "../../services/errors";
import { ErrorBox } from "../common/ErrorBox";
import { DeckNotFound } from "../deck/DeckNotFound";
import { ReviewTopBar } from "../review/ReviewTopBar";
import { QuizSession } from "./QuizSession";
import { QuizTooFew } from "./QuizTooFew";
import styles from "./QuizView.module.css";

export function QuizView({ deckId }: { deckId: string }) {
  const [round, setRound] = useState(0);
  const deck = useDeck(deckId);
  const quiz = useQuiz(deckId, round);
  const exit: ReviewExit = { to: `/decks/${deckId}`, label: "Back to deck" };

  const tooFew = quiz.isError && isNotEnoughCardsError(quiz.error);

  if (
    (deck.isError && isNotFoundError(deck.error)) ||
    (quiz.isError && isNotFoundError(quiz.error) && !tooFew)
  ) {
    return (
      <div className={styles.page}>
        <DeckNotFound />
      </div>
    );
  }

  if (quiz.isSuccess && quiz.data.questions.length > 0) {
    return (
      <QuizSession
        key={round}
        exit={exit}
        deckName={deck.data?.name}
        questions={quiz.data.questions}
        onRestart={() => setRound((prev) => prev + 1)}
      />
    );
  }

  const deckTooSmall = deck.data !== undefined && deck.data.card_count < QUIZ_MIN_CARDS;

  return (
    <div className={styles.page}>
      <ReviewTopBar exitTo={exit.to} deckName={deck.data?.name} badge="Quiz" />
      {tooFew || deckTooSmall || quiz.isSuccess ? (
        <QuizTooFew deckId={deckId} />
      ) : quiz.isPending ? (
        <div className={styles.skeleton} aria-hidden="true">
          <div className={styles.prompt} />
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className={styles.option} />
          ))}
        </div>
      ) : (
        <ErrorBox message={getErrorMessage(quiz.error)} onRetry={() => quiz.refetch()} />
      )}
    </div>
  );
}
