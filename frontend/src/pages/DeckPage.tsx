import { Navigate, useParams } from "react-router";

import { DeckView } from "../components/deck/DeckView";

export function DeckPage() {
  const { deckId } = useParams();
  if (!deckId) {
    return <Navigate to={"/"} replace />;
  }
  return <DeckView key={deckId} deckId={deckId} />;
}
