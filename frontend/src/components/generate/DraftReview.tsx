import { useState } from "react";
import { useDeleteDraft } from "../../hooks/useDeleteDraft";
import { useUpdateDraft } from "../../hooks/useUpdateDraft";
import { getErrorMessage } from "../../services/errors";
import type { CardDraft, Generation } from "../../types/models";
import { CardFormDialog } from "../card/CardFormDialog";
import { Spinner } from "../common/Spinner";
import { DraftActionBar } from "./DraftActionBar";
import { DraftRow } from "./DraftRow";
import { RefineBox } from "./RefineBox";
import styles from "./DraftReview.module.css";

export function DraftReview({ generation }: { generation: Generation }) {
  const { drafts } = generation;
  const refining = generation.status === "queued" || generation.status === "running";
  const toggle = useUpdateDraft(generation.id);
  const edit = useUpdateDraft(generation.id);
  const remove = useDeleteDraft(generation.id);
  const [editing, setEditing] = useState<CardDraft | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const includedCount = drafts.filter((draft) => draft.included).length;
  const allIncluded = includedCount === drafts.length;

  async function run(actions: Promise<unknown>[]) {
    setActionError(null);
    const results = await Promise.allSettled(actions);
    const failed = results.find((result) => result.status === "rejected");
    if (failed) setActionError(getErrorMessage(failed.reason));
  }

  function setIncluded(draft: CardDraft, included: boolean) {
    run([toggle.mutateAsync({ draftId: draft.id, data: { included } })]);
  }

  function selectAll(included: boolean) {
    run(
      drafts
        .filter((draft) => draft.included !== included)
        .map((draft) => toggle.mutateAsync({ draftId: draft.id, data: { included } })),
    );
  }

  return (
    <section className={styles.review} aria-labelledby="drafts-heading">
      {generation.status === "failed" && (
        <p role="alert" className={styles.failed}>
          Refine failed: {generation.error_message ?? "Something went wrong"}
        </p>
      )}
      {refining && (
        <p className={styles.refining}>
          <Spinner />
          Refining…
        </p>
      )}

      <div className={styles.toolbar}>
        <h2 id="drafts-heading" className={styles.selected}>
          {includedCount} of {drafts.length} selected
        </h2>
        <button
          type="button"
          className={styles.textButton}
          onClick={() => selectAll(!allIncluded)}
          disabled={refining}
        >
          {allIncluded ? "Select none" : "Select all"}
        </button>
      </div>

      {actionError && (
        <p role="alert" className={styles.actionError}>
          {actionError}
        </p>
      )}

      <div className={refining ? styles.locked : undefined} inert={refining} aria-busy={refining}>
        <ol className={styles.list}>
          {drafts.map((draft) => (
            <DraftRow
              key={draft.id}
              draft={draft}
              onToggle={(included) => setIncluded(draft, included)}
              onEdit={() => setEditing(draft)}
              onDelete={() => run([remove.mutateAsync(draft.id)])}
            />
          ))}
        </ol>
        <div className={styles.refine}>
          <RefineBox key={generation.instructions ?? ""} generation={generation} />
        </div>
      </div>

      <DraftActionBar generation={generation} includedCount={includedCount} locked={refining} />

      {editing && (
        <CardFormDialog
          open
          onOpenChange={(open) => {
            if (!open) setEditing(null);
          }}
          deckId={generation.deck_id}
          draftEdit={{
            draft: editing,
            onSubmit: (data) => edit.mutateAsync({ draftId: editing.id, data }),
          }}
        />
      )}
    </section>
  );
}
