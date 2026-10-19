import { useState } from "react";
import { ListChecks, Pencil, Play, Shuffle, Trash2 } from "lucide-react";
import styles from "./DeckHeader.module.css";
import type { Deck } from "../../types/models";
import { Link } from "react-router";
import { useDeleteDeck } from "../../hooks/useDeleteDeck";
import { getErrorMessage } from "../../services/errors";
import { ConfirmDialog } from "../common/ConfirmDialog";
import { DeckFormDialog } from "./DeckFormDialog";

export const QUIZ_MIN_CARDS = 4;

export function DeckHeader({ deck }: { deck: Deck }) {
  const canStudy = deck.due_count > 0;
  const canPractice = deck.card_count > 0;
  const canQuiz = deck.card_count >= QUIZ_MIN_CARDS;
  const practiceFirst = !canStudy && canPractice;
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const deleteMutation = useDeleteDeck();

  const studyButton = canStudy ? (
    <Link to={`/decks/${deck.id}/review`} className={`${styles.button} ${styles.primary}`}>
      <Play size={18} aria-hidden="true" />
      Study
    </Link>
  ) : (
    <span
      className={`${styles.button} ${practiceFirst ? styles.secondary : styles.primary} ${styles.disabled}`}
      aria-disabled="true"
    >
      <Play size={18} aria-hidden="true" />
      Nothing due
    </span>
  );

  const practiceButton = canPractice ? (
    <Link
      to={`/decks/${deck.id}/practice`}
      className={`${styles.button} ${practiceFirst ? styles.primary : styles.secondary}`}
    >
      <Shuffle size={18} aria-hidden="true" />
      Practice
    </Link>
  ) : (
    <span
      className={`${styles.button} ${styles.secondary} ${styles.disabled}`}
      aria-disabled="true"
    >
      <Shuffle size={18} aria-hidden="true" />
      Practice
    </span>
  );

  const quizButton = canQuiz ? (
    <Link to={`/decks/${deck.id}/quiz`} className={`${styles.button} ${styles.secondary}`}>
      <ListChecks size={18} aria-hidden="true" />
      Quiz me
    </Link>
  ) : (
    <span
      className={`${styles.button} ${styles.secondary} ${styles.disabled}`}
      aria-disabled="true"
    >
      <ListChecks size={18} aria-hidden="true" />
      Quiz needs {QUIZ_MIN_CARDS}+ cards
    </span>
  );

  return (
    <section className={styles.header}>
      <div className={styles.top}>
        <h1 className={styles.title}>{deck.name}</h1>
        <div className={styles.tools}>
          <button
            type="button"
            className={styles.iconButton}
            aria-label="Edit deck"
            onClick={() => setEditOpen(true)}
          >
            <Pencil size={18} aria-hidden="true" />
          </button>
          <button
            type="button"
            className={`${styles.iconButton} ${styles.iconDanger}`}
            aria-label="Delete deck"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 size={18} aria-hidden="true" />
          </button>
        </div>
      </div>
      {deck.description && <p className={styles.description}>{deck.description}</p>}

      <ul className={styles.chips}>
        <li className={`${styles.chip} ${canStudy ? styles.chipDue : ""}`}>
          <strong>{deck.due_count}</strong> due
        </li>
        <li className={styles.chip}>
          <strong>{deck.card_count}</strong> {deck.card_count === 1 ? "card" : "cards"}
        </li>
        <li className={styles.chip}>
          Mastery <strong>{deck.mastery}%</strong>
        </li>
      </ul>

      <div className={styles.actions}>
        {practiceFirst ? (
          <>
            {practiceButton}
            {studyButton}
          </>
        ) : (
          <>
            {studyButton}
            {practiceButton}
          </>
        )}
        {quizButton}
      </div>

      {editOpen && <DeckFormDialog key={deck.id} open onOpenChange={setEditOpen} deck={deck} />}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open);
          if (!open) deleteMutation.reset();
        }}
        title={`Delete “${deck.name}”?`}
        description={`The deck and its ${deck.card_count} ${
          deck.card_count === 1 ? "card" : "cards"
        } will disappear from your decks and study sessions. Your review history is kept, so your stats stay accurate.`}
        confirmLabel="Delete deck"
        onConfirm={() => deleteMutation.mutateAsync(deck.id)}
        error={deleteMutation.isError ? getErrorMessage(deleteMutation.error) : undefined}
      />
    </section>
  );
}
