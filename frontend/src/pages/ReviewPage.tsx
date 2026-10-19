import { Navigate, useParams } from "react-router";

import { ReviewView } from "../components/review/ReviewView";

export function ReviewPage() {
  const { deckId } = useParams();
  if (!deckId) {
    return <Navigate to={"/"} replace />;
  }
  return <ReviewView deckId={deckId} />;
}
