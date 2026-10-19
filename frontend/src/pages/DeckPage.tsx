import { Navigate, useParams, Link } from "react-router";
import { ArrowLeft } from "lucide-react";
import { useCards } from "../hooks/useCards";
import { useDeck } from "../hooks/useDeck";

import styles from "./DeckPage.module.css";
import { DeckHeader } from "../components/deck/DeckHeader";
import { CardList } from "../components/card/CardList";

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
    <div className={styles.page}>
      <Link to="/" className={styles.back}>
        <ArrowLeft size={18} aria-hidden="true" />
        All decks
      </Link>
      {deck.data ? <DeckHeader deck={deck.data} /> : <p>Loading deck...</p>}
      <section className={styles.cards} aria-label="cards-heading">
        <div className={styles.sectionHeader}>
          <h2 id="cards-heading" className={styles.sectionTitle}>
            Cards
          </h2>
          {cards.data && <span className={styles.count}>{cards.data.length}</span>}
        </div>
        {cards.data ? <CardList cards={cards.data} /> : <p>Loading cards...</p>}
      </section>
    </div>
  );
}
