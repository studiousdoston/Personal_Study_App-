import { Link } from "react-router";
import { ArrowLeft } from "lucide-react";
import { useDeck } from "../../hooks/useDeck";
import type { Generation } from "../../types/models";
import { plural } from "../../utils/plural";
import { DeckBadge } from "../deck/DeckBadge";
import styles from "./GenerationHeader.module.css";

const MODE_LABELS: Record<Generation["mode"], string> = { qa: "Q&A", vocab: "Vocabulary" };

export function GenerationHeader({ generation }: { generation: Generation }) {
  const deck = useDeck(generation.deck_id);

  return (
    <header className={styles.header}>
      <Link to={`/decks/${generation.deck_id}`} className={styles.back}>
        <ArrowLeft size={18} aria-hidden="true" />
        Back to deck
      </Link>
      <div className={styles.top}>
        {deck.data ? (
          <DeckBadge color={deck.data.color} icon={deck.data.icon} size="md" />
        ) : (
          <span className={styles.badgeSkeleton} aria-hidden="true" />
        )}
        <div className={styles.text}>
          <h1 className={styles.title}>{deck.data?.name ?? "Generating cards"}</h1>
          <p className={styles.meta}>
            {MODE_LABELS[generation.mode]} · {plural(generation.count, "card")}
          </p>
        </div>
      </div>
    </header>
  );
}
