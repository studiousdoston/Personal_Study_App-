import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useDeleteCard } from "../../hooks/useDeleteCard";
import { getErrorMessage } from "../../services/errors";
import type { Card } from "../../types/models";
import { ConfirmDialog } from "../common/ConfirmDialog";
import styles from "./CardList.module.css";

type CardListProps = {
  cards: Card[];
  onEdit: (card: Card) => void;
  onAdd: () => void;
};

const PREVIEW_LENGTH = 80;

function isDue(card: Card, now: number) {
  return new Date(card.next_review_at).getTime() <= now;
}

function preview(text: string) {
  return text.length > PREVIEW_LENGTH ? `${text.slice(0, PREVIEW_LENGTH).trimEnd()}…` : text;
}

export function CardList({ cards, onEdit, onAdd }: CardListProps) {
  const [now] = useState(() => Date.now());
  const [deleting, setDeleting] = useState<Card | null>(null);
  const deleteMutation = useDeleteCard();

  if (cards.length === 0) {
    return (
      <div className={styles.empty}>
        <p>No cards yet. Add your first card to start studying</p>
        <button type="button" className={styles.addFirst} onClick={onAdd}>
          <Plus size={18} aria-hidden="true" />
          Add your first card
        </button>
      </div>
    );
  }

  return (
    <>
      <ul className={styles.list}>
        {cards.map((card) => (
          <li key={card.id} className={styles.row}>
            <div className={styles.content}>
              <div className={styles.side}>
                <div className={styles.labelRow}>
                  <span className={styles.label}>Front</span>
                  {isDue(card, now) && <span className={styles.due}>Due</span>}
                </div>
                <p className={styles.front}>{card.front}</p>
              </div>
              <div className={styles.side}>
                <span className={styles.label}>Back</span>
                <p className={styles.back}>{card.back}</p>
              </div>
            </div>
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.iconButton}
                aria-label="Edit card"
                onClick={() => onEdit(card)}
              >
                <Pencil size={18} aria-hidden="true" />
              </button>
              <button
                type="button"
                className={`${styles.iconButton} ${styles.iconDanger}`}
                aria-label="Delete card"
                onClick={() => setDeleting(card)}
              >
                <Trash2 size={18} aria-hidden="true" />
              </button>
            </div>
          </li>
        ))}
      </ul>
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (open) return;
          setDeleting(null);
          deleteMutation.reset();
        }}
        title="Delete card?"
        description={
          <>
            “{preview(deleting?.front ?? "")}” will be removed from this deck. Your review history
            for this card is kept.
          </>
        }
        confirmLabel="Delete card"
        onConfirm={() => deleteMutation.mutateAsync(deleting!.id)}
        error={deleteMutation.isError ? getErrorMessage(deleteMutation.error) : undefined}
      />
    </>
  );
}
