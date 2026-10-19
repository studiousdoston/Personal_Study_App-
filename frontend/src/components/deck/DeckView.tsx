import { Link } from "react-router";
import { ArrowLeft } from "lucide-react";

import { useCards } from "../../hooks/useCards";
import { useDeck } from "../../hooks/useDeck";
import styles from "./DeckView.module.css";
import { DeckHeader } from "./DeckHeader";
import { DeckNotFound } from "./DeckNotFound";
import { CardList } from "../card/CardList";
import { CardListSkeleton } from "../card/CardListSkeleton";
import { ErrorBox } from "../common/ErrorBox";
import { getErrorMessage, isNotFoundError } from "../../services/errors";

export function DeckView({ deckId }: { deckId: string }) {
  const deck = useDeck(deckId);
  const cards = useCards(deckId);

  if (deck.isError && isNotFoundError(deck.error)) {
    return <DeckNotFound />;
  }
  return (
    <div className={styles.page}>
      <Link to="/" className={styles.back}>
        <ArrowLeft size={18} aria-hidden="true" />
        All decks
      </Link>
      {deck.isPending ? (
        <div className={`${styles.skeleton} ${styles.skeletonHeader}`} aria-hidden="true" />
      ) : deck.isError ? (
        <ErrorBox message={getErrorMessage(deck.error)} onRetry={() => deck.refetch()} />
      ) : (
        <DeckHeader deck={deck.data} />
      )}
      <section className={styles.cards} aria-label="cards-heading" aria-busy={cards.isPending}>
        <div className={styles.sectionHeader}>
          <h2 id="cards-heading" className={styles.sectionTitle}>
            Cards
          </h2>
          {cards.data && <span className={styles.count}>{cards.data.length}</span>}
        </div>
        {cards.isPending ? (
          <CardListSkeleton />
        ) : cards.isError ? (
          <ErrorBox message={getErrorMessage(cards.error)} onRetry={() => cards.refetch()} />
        ) : (
          <CardList cards={cards.data} />
        )}
      </section>
    </div>
  );
}
