import { useState } from "react";
import type { QuizQuestion } from "../types/models";
import { emitFeedback } from "../utils/feedback";

export const OPTION_KEYS = ["1", "2", "3", "4"];

type QuizAnswer = { question: QuizQuestion; chosen: number };

export type MissedQuestion = { cardId: string; prompt: string; answer: string };

function correctText(question: QuizQuestion) {
  return question.options.find((option) => option.is_correct)?.text ?? "";
}

function isCorrect(answer: QuizAnswer) {
  return answer.question.options[answer.chosen]?.is_correct ?? false;
}

export function useQuizSession(questions: QuizQuestion[]) {
  const [position, setPosition] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswer[]>([]);

  const current = questions[position] as QuizQuestion | undefined;
  const finished = current === undefined;
  const currentAnswer = answers[position] as QuizAnswer | undefined;
  const chosen = currentAnswer?.chosen ?? null;
  const answered = chosen !== null;

  function pick(index: number) {
    if (!current || answered || !current.options[index]) return;
    setAnswers((prev) =>
      prev.length > position ? prev : [...prev, { question: current, chosen: index }],
    );
    emitFeedback(current.options[index].is_correct ? "correct" : "wrong");
  }

  function next() {
    if (!answered) return;
    setPosition((prev) => prev + 1);
    if (position + 1 === questions.length) {
      emitFeedback("quizDone", {
        total: questions.length,
        correct,
        perfect: correct === questions.length,
      });
    }
  }

  const correct = answers.filter(isCorrect).length;
  const missed: MissedQuestion[] = answers
    .filter((answer) => !isCorrect(answer))
    .map(({ question }) => ({
      cardId: question.card_id,
      prompt: question.prompt,
      answer: correctText(question),
    }));

  return {
    current,
    finished,
    chosen,
    answered,
    answeredCorrectly: currentAnswer ? isCorrect(currentAnswer) : false,
    correctAnswer: current ? correctText(current) : "",
    isLast: position === questions.length - 1,
    pick,
    next,
    progress: { done: answers.length, total: questions.length },
    summary: {
      correct,
      total: questions.length,
      percent: questions.length === 0 ? 0 : Math.round((correct / questions.length) * 100),
      missed,
    },
  };
}
