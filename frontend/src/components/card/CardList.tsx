import { useState } from "react";
import type { Card } from "../../types/models";
import styles from "./CardList.module.css";

function isDue(card: Card, now: number) {
  return new Date(card.next_review_at).getTime() <= now;
}

export function CardList({ cards }: { cards: Card[] }) {
  const [now] = useState(() => Date.now());
  if (cards.length === 0) {
    return <p className={styles.empty}>No cards yet. Add your first card to start studying</p>;
  }

  return (
    <ul className={styles.list}>
      {cards.map((card) => (
        <li key={card.id} className={styles.row}>
          <div className={styles.side}>
            <span className={styles.label}>Front</span>
            <p className={styles.front}>{card.front}</p>
          </div>
          <div className={styles.side}>
            <span className={styles.label}>Back</span>
            <p className={styles.back}>{card.back}</p>
          </div>
          {isDue(card, now) && <span className={styles.due}>Due</span>}
        </li>
      ))}
    </ul>
  );
}
