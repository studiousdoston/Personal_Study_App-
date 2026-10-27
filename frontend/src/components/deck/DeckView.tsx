import { useState } from "react";
import { Link } from "react-router";
import { ArrowLeft, Plus, Sparkles } from "lucide-react";

import { useCards } from "../../hooks/useCards";
import { useDeck } from "../../hooks/useDeck";
import styles from "./DeckView.module.css";
import { DeckHeader } from "./DeckHeader";
import { DeckNotFound } from "./DeckNotFound";
import { CardList } from "../card/CardList";
import { CardListSkeleton } from "../card/CardListSkeleton";
import { CardFormDialog } from "../card/CardFormDialog";
import { CardFilters } from "../card/CardFilters";
import { ErrorBox } from "../common/ErrorBox";
import { getErrorMessage, isNotFoundError } from "../../services/errors";
import { filterCards, isFilterActive } from "../../utils/filterCards";
import type { Card } from "../../types/models";

type CardDialogState = { mode: "closed" } | { mode: "add" } | { mode: "edit"; card: Card };

export function DeckView({ deckId }: { deckId: string }) {
  const deck = useDeck(deckId);
  const cards = useCards(deckId);
  const [dialog, setDialog] = useState<CardDialogState>({ mode: "closed" });
  const editingCard = dialog.mode === "edit" ? dialog.card : undefined;
  const [now] = useState(() => Date.now());
  const [query, setQuery] = useState("");
  const [dueOnly, setDueOnly] = useState(false);
  const filterActive = isFilterActive({ query, dueOnly });
  const allCards = cards.data ?? [];
  const visibleCards = filterCards(allCards, { query, dueOnly, now });

  function clearFilters() {
    setQuery("");
    setDueOnly(false);
  }

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
          <Link
            to={`/generate?deck=${deckId}`}
            className={styles.aiButton}
            aria-label="Generate with AI"
          >
            <Sparkles size={18} aria-hidden="true" />
            <span className={styles.aiLabel}>Generate with AI</span>
          </Link>
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
          <>
            {allCards.length > 0 && (
              <CardFilters
                query={query}
                dueOnly={dueOnly}
                onQueryChange={setQuery}
                onDueOnlyChange={setDueOnly}
                shown={visibleCards.length}
                total={allCards.length}
                active={filterActive}
              />
            )}
            {allCards.length > 0 && visibleCards.length === 0 ? (
              <div className={styles.noMatch}>
                <p>{query.trim() !== "" ? `No cards match “${query.trim()}”` : "No due cards"}</p>
                <button type="button" className={styles.clearButton} onClick={clearFilters}>
                  Clear filters
                </button>
              </div>
            ) : (
              <CardList
                cards={visibleCards}
                now={now}
                onEdit={(card) => setDialog({ mode: "edit", card })}
                onAdd={() => setDialog({ mode: "add" })}
              />
            )}
          </>
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
