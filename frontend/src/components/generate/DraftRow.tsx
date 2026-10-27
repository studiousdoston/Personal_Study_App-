import { useId } from "react";
import { Lock, Pencil, Trash2 } from "lucide-react";
import type { CardDraft } from "../../types/models";
import styles from "./DraftRow.module.css";

type DraftRowProps = {
  draft: CardDraft;
  onToggle: (included: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
};

export function DraftRow({ draft, onToggle, onEdit, onDelete }: DraftRowProps) {
  const frontId = useId();

  return (
    <li className={`${styles.row} ${draft.included ? "" : styles.excluded}`}>
      <label className={styles.check}>
        <input
          type="checkbox"
          className={styles.checkbox}
          checked={draft.included}
          onChange={(e) => onToggle(e.target.checked)}
          aria-labelledby={frontId}
        />
      </label>
      <div className={styles.content}>
        <p id={frontId} className={styles.front}>
          {draft.front}
        </p>
        <p className={styles.back}>{draft.back}</p>
        {(draft.is_duplicate || draft.edited) && (
          <div className={styles.badges}>
            {draft.is_duplicate && <span className={styles.duplicate}>Already in deck</span>}
            {draft.edited && (
              <span className={styles.edited}>
                <Lock size={12} aria-hidden="true" />
                Edited
              </span>
            )}
          </div>
        )}
      </div>
      <div className={styles.actions}>
        <button type="button" className={styles.iconButton} aria-label="Edit" onClick={onEdit}>
          <Pencil size={18} aria-hidden="true" />
        </button>
        <button
          type="button"
          className={`${styles.iconButton} ${styles.iconDanger}`}
          aria-label="Delete"
          onClick={onDelete}
        >
          <Trash2 size={18} aria-hidden="true" />
        </button>
      </div>
    </li>
  );
}
