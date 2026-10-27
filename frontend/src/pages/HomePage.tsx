import { useState } from "react";
import { Link } from "react-router";
import { Plus, Sparkles } from "lucide-react";
import { useStats } from "../hooks/useStats";
import { useDecks } from "../hooks/useDecks";
import { StatTiles } from "../components/stats/StatTiles";
import { DeckGrid } from "../components/deck/DeckGrid";
import { DeckFormDialog } from "../components/deck/DeckFormDialog";
import { DraftsWaitingBanner } from "../components/generate/DraftsWaitingBanner";
import { pluralWord } from "../utils/plural";
import styles from "./HomePage.module.css";

const dateFormat = new Intl.DateTimeFormat(undefined, {
  weekday: "long",
  month: "short",
  day: "numeric",
});
// undefined = the browser's locale. Created once, reused on every render

export function HomePage() {
  const { data: stats } = useStats();
  const { data: decks } = useDecks();
  const [newDeckOpen, setNewDeckOpen] = useState(false);
  // same query keys as AppLayout, StatTiles and DeckGrid, so React Query serves them from cache

  return (
    <div className={styles.page}>
      <header className={styles.welcome}>
        <p className={styles.date}>{dateFormat.format(new Date())}</p>
        <h1 className={styles.title}>Welcome back</h1>
        {stats &&
          (stats.cards_due > 0 ? (
            <p className={styles.subtitle}>
              You have <span className={styles.highlight}>{stats.cards_due}</span>{" "}
              {pluralWord(stats.cards_due, "card")} due today.
            </p>
          ) : (
            <p className={styles.subtitle}>All caught up for today.</p>
          ))}
      </header>
      {/* no subtitle while loading or on error — StatTiles shows the error */}

      <StatTiles />

      <section className={styles.decks} aria-labelledby="decks-heading">
        <DraftsWaitingBanner />
        <div className={styles.decksHeader}>
          <div className={styles.decksTitle}>
            <h2 id="decks-heading" className={styles.heading}>
              Your decks
            </h2>
            {decks && <span className={styles.count}>{decks.length}</span>}
          </div>
          <div className={styles.headerActions}>
            <Link to="/generate" className={styles.aiButton} aria-label="Generate with AI">
              <Sparkles size={18} aria-hidden="true" />
              <span className={styles.aiLabel}>Generate with AI</span>
            </Link>
            <button type="button" className={styles.newButton} onClick={() => setNewDeckOpen(true)}>
              <Plus size={18} aria-hidden="true" />
              New deck
            </button>
          </div>
        </div>

        <DeckGrid onCreate={() => setNewDeckOpen(true)} />
      </section>

      <DeckFormDialog open={newDeckOpen} onOpenChange={setNewDeckOpen} />
    </div>
  );
}
