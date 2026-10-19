import { Link } from "react-router";
import { ListChecks } from "lucide-react";
import { QUIZ_MIN_CARDS } from "../../constants";
import styles from "./QuizTooFew.module.css";

export function QuizTooFew({ deckId }: { deckId: string }) {
  return (
    <main className={styles.empty}>
      <ListChecks size={40} className={styles.icon} aria-hidden="true" />
      <h1 className={styles.title}>This deck needs at least {QUIZ_MIN_CARDS} cards for a quiz</h1>
      <p>
        The wrong options come from the answers of other cards, so the deck needs at least{" "}
        {QUIZ_MIN_CARDS} different answers.
      </p>
      <Link to={`/decks/${deckId}`} className={styles.link}>
        Back to deck
      </Link>
    </main>
  );
}
