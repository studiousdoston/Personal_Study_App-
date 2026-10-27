import { Plus, X } from "lucide-react";
import { useId } from "react";
import { AI_MAX_SOURCES } from "../../constants";
import styles from "./SourceList.module.css";

export type SourceBlock = { id: number; text: string };

type SourceListProps = {
  sources: SourceBlock[];
  onChange: (id: number, text: string) => void;
  onAdd: () => void;
  onRemove: (id: number) => void;
  error?: string;
};

function autoGrow(textarea: HTMLTextAreaElement) {
  textarea.style.height = "auto";
  textarea.style.height = `${textarea.scrollHeight + 2}px`;
}
// +2 = the top and bottom border, so the last line isn't clipped

export function SourceList({ sources, onChange, onAdd, onRemove, error }: SourceListProps) {
  const headingId = useId();
  const errorId = useId();
  const single = sources.length === 1;

  return (
    <fieldset className={styles.fieldset} aria-describedby={error ? errorId : undefined}>
      <legend id={headingId} className={styles.label}>
        Notes
      </legend>
      <ol className={styles.list}>
        {sources.map((source, index) => (
          <li key={source.id} className={styles.block}>
            {!single && (
              <div className={styles.blockHeader}>
                <span className={styles.blockLabel}>Text {index + 1}</span>
                <button
                  type="button"
                  className={styles.remove}
                  aria-label={`Remove text ${index + 1}`}
                  onClick={() => onRemove(source.id)}
                >
                  <X size={18} aria-hidden="true" />
                </button>
              </div>
            )}
            <textarea
              className={`${styles.textarea} ${error ? styles.invalid : ""}`}
              rows={6}
              value={source.text}
              placeholder="Paste your notes here"
              aria-label={single ? "Notes" : `Text ${index + 1}`}
              aria-invalid={error ? true : undefined}
              onChange={(e) => {
                onChange(source.id, e.target.value);
                autoGrow(e.target);
              }}
            />
          </li>
        ))}
      </ol>

      {error && (
        <p id={errorId} className={styles.error}>
          {error}
        </p>
      )}

      {sources.length < AI_MAX_SOURCES ? (
        <button type="button" className={styles.add} onClick={onAdd}>
          <Plus size={18} aria-hidden="true" />
          Add text
        </button>
      ) : (
        <p className={styles.muted}>Up to {AI_MAX_SOURCES} texts.</p>
      )}
      <p className={styles.muted}>Links, photos and PDFs are coming soon.</p>
    </fieldset>
  );
}
