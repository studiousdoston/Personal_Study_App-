import { useState } from "react";
import { useDeleteGeneration } from "../../hooks/useDeleteGeneration";
import { useSaveGeneration } from "../../hooks/useSaveGeneration";
import { getErrorMessage, hasStatus } from "../../services/errors";
import type { Generation } from "../../types/models";
import { plural } from "../../utils/plural";
import { ConfirmDialog } from "../common/ConfirmDialog";
import { ErrorBox } from "../common/ErrorBox";
import { Spinner } from "../common/Spinner";
import styles from "./DraftActionBar.module.css";

type DraftActionBarProps = {
  generation: Generation;
  includedCount: number;
  locked: boolean;
};

const LOCKED_MESSAGE = "Wait for the new cards to finish.";
const NOTHING_SELECTED = "Select at least one card.";

export function DraftActionBar({ generation, includedCount, locked }: DraftActionBarProps) {
  const save = useSaveGeneration(generation.id);
  const discard = useDeleteGeneration(generation.id, generation.deck_id);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const saveError = save.isError
    ? hasStatus(save.error, 404)
      ? "This deck no longer exists."
      : hasStatus(save.error, 422)
        ? NOTHING_SELECTED
        : null
    : null;

  function handleSave() {
    if (save.isPending) return;
    if (locked) return setNotice(LOCKED_MESSAGE);
    if (includedCount === 0) return setNotice(NOTHING_SELECTED);
    setNotice(null);
    save.mutate();
  }

  function handleDiscard() {
    if (locked) return setNotice(LOCKED_MESSAGE);
    setNotice(null);
    setConfirmOpen(true);
  }

  return (
    <div className={styles.bar}>
      {save.isError && saveError === null ? (
        <ErrorBox message={getErrorMessage(save.error)} onRetry={handleSave} />
      ) : (
        (notice ?? saveError) && (
          <p role="alert" className={styles.notice}>
            {notice ?? saveError}
          </p>
        )
      )}
      <div className={styles.buttons}>
        <button
          type="button"
          className={`${styles.secondary} ${locked ? styles.locked : ""}`}
          aria-disabled={locked}
          onClick={handleDiscard}
        >
          Discard
        </button>
        <button
          type="button"
          className={`${styles.primary} ${locked ? styles.locked : ""}`}
          aria-disabled={locked}
          aria-busy={save.isPending}
          onClick={handleSave}
        >
          {save.isPending && <Spinner />}
          Save {plural(includedCount, "card")}
        </button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={(open) => {
          setConfirmOpen(open);
          if (!open) discard.reset();
        }}
        title="Discard these drafts?"
        description="None of them will be added to the deck. This can’t be undone."
        confirmLabel="Discard"
        pendingLabel="Discarding..."
        onConfirm={() => discard.mutateAsync()}
        error={discard.isError ? getErrorMessage(discard.error) : undefined}
      />
    </div>
  );
}
