import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import type { Card } from "../../types/models";
import styles from "./CardList.module.css";

type CardListProps = {
  cards: Card[];
  onEdit: (card: Card) => void;
  onAdd: () => void;
};

function isDue(card: Card, now: number) {
  return new Date(card.next_review_at).getTime() <= now;
}

export function CardList({ cards, onEdit, onAdd }: CardListProps) {
  const [now] = useState(() => Date.now());
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
          </div>
        </li>
      ))}
    </ul>
  );
}
