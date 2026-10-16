import { Plus } from "lucide-react";
import { useDecks } from "../../hooks/useDecks";
import { getErrorMessage } from "../../services/errors";
import styles from "./DeckGrid.module.css";
import { DeckTile } from "./DeckTile";

type DeckGridProps = {
  onCreate: () => void;
};

export function DeckGrid({ onCreate }: DeckGridProps) {
  const { data: decks, isPending, isError, error, refetch } = useDecks();

  if (isPending) {
    return (
      <div className={styles.grid} aria-busy="true">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className={styles.skeleton} />
        ))}
      </div>
    );
  }
  // loading: 4 grey placeholder tiles in the same grid, so the page doesn't jump

  if (isError) {
    return (
      <div className={styles.error}>
        <p>{getErrorMessage(error)}</p>
        <button type="button" className={styles.retry} onClick={() => refetch()}>
          Try again
        </button>
      </div>
    );
  }
  // refetch() re-runs the query. Wrapped in an arrow so the click event isn't passed to it

  return (
    <div className={styles.grid}>
      {decks.map((deck) => (
        <DeckTile key={deck.id} deck={deck} />
      ))}
      <button type="button" className={styles.createTile} onClick={onCreate}>
        <Plus size={24} aria-hidden="true" />
        <span className={styles.createTitle}>Create deck</span>
        <span className={styles.createHint}>Add a new set of cards</span>
      </button>
    </div>
  );
}
