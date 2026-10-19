import { Link } from "react-router";
import { CircleCheck, Layers } from "lucide-react";
import type { SessionMode } from "../../hooks/useReviewSession";
import styles from "./ReviewEmpty.module.css";

type ReviewEmptyProps = {
  deckId: string;
  mode?: SessionMode;
};

export function ReviewEmpty({ deckId, mode = "review" }: ReviewEmptyProps) {
  const Icon = mode === "practice" ? Layers : CircleCheck;

  return (
    <main className={styles.empty}>
      <Icon size={40} className={styles.icon} aria-hidden="true" />
      {mode === "practice" ? (
        <>
          <h1 className={styles.title}>No cards to practice</h1>
          <p>This deck is empty. Add a few cards first, then come back to practice.</p>
        </>
      ) : (
        <>
          <h1 className={styles.title}>Nothing due right now</h1>
          <p>You're all caught up with this deck. Come back later for the next review.</p>
        </>
      )}
      <Link to={`/decks/${deckId}`} className={styles.link}>
        Back to deck
      </Link>
    </main>
  );
}
