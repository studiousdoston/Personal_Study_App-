import { Link } from "react-router";
import styles from "./DeckNotFound.module.css";

export function DeckNotFound() {
  return (
    <div className={styles.notFound}>
      <h1 className={styles.notFoundTitle}>Deck not found</h1>
      <p>It may have been deleted, or the link is wrong.</p>
      <Link to="/" className={styles.homeLink}>
        Back to all decks
      </Link>
    </div>
  );
}
