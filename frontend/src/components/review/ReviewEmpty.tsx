import { Link } from "react-router";
import { CircleCheck } from "lucide-react";
import styles from "./ReviewEmpty.module.css";

export function ReviewEmpty({ deckId }: { deckId: string }) {
  return (
    <main className={styles.empty}>
      <CircleCheck size={40} className={styles.icon} aria-hidden="true" />
      <h1 className={styles.title}>Nothing due right now</h1>
      <p>You're all caught up with this deck. Come back later for the next review.</p>
      <Link to={`/decks/${deckId}`} className={styles.link}>
        Back to deck
      </Link>
    </main>
  );
}
