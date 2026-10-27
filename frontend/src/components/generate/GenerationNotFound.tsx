import { Link } from "react-router";
import styles from "../deck/DeckNotFound.module.css";

export function GenerationNotFound() {
  return (
    <div className={styles.notFound}>
      <h1 className={styles.notFoundTitle}>Drafts not found</h1>
      <p>They may have been saved, discarded or expired, or the deck was deleted.</p>
      <Link to="/" className={styles.homeLink}>
        Back to all decks
      </Link>
    </div>
  );
}
