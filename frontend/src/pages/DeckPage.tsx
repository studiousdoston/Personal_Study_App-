import { Navigate, useParams } from "react-router";
import { useCards } from "../hooks/useCards";
import { useDeck } from "../hooks/useDeck";

export function DeckPage() {
  const { deckId } = useParams();

  if (!deckId) {
    return <Navigate to={"/"} replace />;
  }

  return <DeckView deckId={deckId} />;
}

function DeckView({ deckId }: { deckId: string }) {
  const deck = useDeck(deckId);
  const cards = useCards(deckId);

  return (
    <div>
      <h1>Deck page</h1>
      <pre>{deck.isPending ? "Loading deck" : JSON.stringify(deck.data, null, 2)}</pre>
      <pre>{cards.isPending ? "Loading cards" : JSON.stringify(cards.data, null, 2)}</pre>
    </div>
  );
}
