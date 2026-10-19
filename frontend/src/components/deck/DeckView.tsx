import { useState } from "react";
import { Link } from "react-router";
import { ArrowLeft, Plus } from "lucide-react";

import { useCards } from "../../hooks/useCards";
import { useDeck } from "../../hooks/useDeck";
import styles from "./DeckView.module.css";
import { DeckHeader } from "./DeckHeader";
import { DeckNotFound } from "./DeckNotFound";
import { CardList } from "../card/CardList";
import { CardListSkeleton } from "../card/CardListSkeleton";
import { CardFormDialog } from "../card/CardFormDialog";
import { ErrorBox } from "../common/ErrorBox";
import { getErrorMessage, isNotFoundError } from "../../services/errors";
import type { Card } from "../../types/models";

type CardDialogState = { mode: "closed" } | { mode: "add" } | { mode: "edit"; card: Card };

export function DeckView({ deckId }: { deckId: string }) {
  const deck = useDeck(deckId);
  const cards = useCards(deckId);
  const [dialog, setDialog] = useState<CardDialogState>({ mode: "closed" });
  const editingCard = dialog.mode === "edit" ? dialog.card : undefined;

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
          <button
            type="button"
            className={styles.addButton}
            onClick={() => setDialog({ mode: "add" })}
          >
            <Plus size={18} aria-hidden="true" />
            Add card
          </button>
        </div>
        {cards.isPending ? (
          <CardListSkeleton />
        ) : cards.isError ? (
          <ErrorBox message={getErrorMessage(cards.error)} onRetry={() => cards.refetch()} />
        ) : (
          <CardList
            cards={cards.data}
            onEdit={(card) => setDialog({ mode: "edit", card })}
            onAdd={() => setDialog({ mode: "add" })}
          />
        )}
      </section>
      <CardFormDialog
        key={editingCard?.id ?? "new"}
        open={dialog.mode !== "closed"}
        onOpenChange={(open) => {
          if (!open) setDialog({ mode: "closed" });
        }}
        deckId={deckId}
        card={editingCard}
      />
    </div>
  );
}
