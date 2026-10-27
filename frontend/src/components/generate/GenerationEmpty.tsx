import { Link } from "react-router";
import styles from "./GenerationEmpty.module.css";

export function GenerationEmpty({ deckId }: { deckId: string }) {
  return (
    <div className={styles.empty}>
      <p>No cards could be made from these notes.</p>
      <Link to={`/generate?deck=${deckId}`} className={styles.primaryLink}>
        Try other notes
      </Link>
    </div>
  );
}
