import { ChevronDown } from "lucide-react";
import { useId } from "react";
import type { Deck } from "../../types/models";
import { DeckBadge } from "../deck/DeckBadge";
import styles from "./DeckSelect.module.css";

type DeckSelectProps = {
  decks: Deck[];
  value: string;
  onChange: (deckId: string) => void;
  error?: string;
};

export function DeckSelect({ decks, value, onChange, error }: DeckSelectProps) {
  const selectId = useId();
  const errorId = useId();
  const selected = decks.find((deck) => deck.id === value);

  return (
    <div className={styles.field}>
      <label htmlFor={selectId} className={styles.label}>
        Deck
      </label>
      <div className={styles.row}>
        {selected ? (
          <DeckBadge color={selected.color} icon={selected.icon} size="sm" />
        ) : (
          <span className={styles.placeholder} aria-hidden="true" />
        )}
        <div className={styles.selectWrap}>
          <select
            id={selectId}
            className={`${styles.select} ${error ? styles.invalid : ""}`}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
          >
            <option value="" disabled>
              Choose a deck
            </option>
            {decks.map((deck) => (
              <option key={deck.id} value={deck.id}>
                {deck.name}
              </option>
            ))}
          </select>
          <ChevronDown size={18} className={styles.chevron} aria-hidden="true" />
        </div>
      </div>
      {error && (
        <p id={errorId} className={styles.error}>
          {error}
        </p>
      )}
    </div>
  );
}
