import { Navigate, useParams } from "react-router";

import { QuizView } from "../components/quiz/QuizView";

export function QuizPage() {
  const { deckId } = useParams();
  if (!deckId) {
    return <Navigate to={"/"} replace />;
  }
  return <QuizView deckId={deckId} />;
}
