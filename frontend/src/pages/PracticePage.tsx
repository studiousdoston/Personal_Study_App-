import { Navigate, useParams } from "react-router";

import { PracticeView } from "../components/review/PracticeView";

export function PracticePage() {
  const { deckId } = useParams();
  if (!deckId) {
    return <Navigate to={"/"} replace />;
  }
  return <PracticeView deckId={deckId} />;
}
