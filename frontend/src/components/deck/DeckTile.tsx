import { Link } from "react-router";
import type { Deck } from "../../types/models";
import { firstChar } from "../../utils/firstChar";
import { plural } from "../../utils/plural";
import styles from "./DeckTile.module.css";

type TileStatus = "due" | "done" | "empty";

function getStatus(deck: Deck): TileStatus {
  if (deck.card_count === 0) return "empty";
  return deck.due_count > 0 ? "due" : "done";
}

const PILL_TEXT: Record<TileStatus, (deck: Deck) => string> = {
  due: (deck) => `${deck.due_count} due`,
  done: () => "Done 🎉",
  empty: () => "Empty",
};

export function DeckTile({ deck }: { deck: Deck }) {
  const status = getStatus(deck);
  const countText =
    deck.card_count === 0 ? "No cards yet" : `${plural(deck.card_count, "card")} total`;

  return (
    <Link to={`/decks/${deck.id}`} className={`${styles.tile} ${styles[status]}`}>
      <div className={styles.top}>
        <span className={styles.avatar} aria-hidden="true">
          {firstChar(deck.name)}
        </span>
        <span className={styles.pill}>{PILL_TEXT[status](deck)}</span>
      </div>

      <div className={styles.body}>
        <h3 className={styles.name}>{deck.name}</h3>
        {deck.description && <p className={styles.description}>{deck.description}</p>}
      </div>

      <div className={styles.mastery}>
        <div className={styles.masteryRow}>
          <span>Mastery</span>
          <span>{deck.mastery}%</span>
        </div>
        <div className={styles.track} aria-hidden="true">
          <div className={styles.fill} style={{ width: `${deck.mastery}%` }} />
        </div>
      </div>

      <p className={styles.count}>{countText}</p>
    </Link>
  );
}
