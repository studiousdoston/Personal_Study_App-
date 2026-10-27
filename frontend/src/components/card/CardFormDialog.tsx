import * as Dialog from "@radix-ui/react-dialog";
import { useId, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useCreateCard } from "../../hooks/useCreateCard";
import { useUpdateCard } from "../../hooks/useUpdateCard";
import { getErrorMessage } from "../../services/errors";
import type { Card, CardDraft, CardUpdate, DraftUpdate } from "../../types/models";
import { scrollFieldIntoView } from "../../utils/scrollFieldIntoView";
import dialog from "../common/Dialog.module.css";
import styles from "./CardFormDialog.module.css";

type CardFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deckId: string;
  card?: Card;
  draftEdit?: DraftEdit;
};

type DraftEdit = {
  draft: CardDraft;
  onSubmit: (changes: DraftUpdate) => Promise<unknown>;
};

export function CardFormDialog({
  open,
  onOpenChange,
  deckId,
  card,
  draftEdit,
}: CardFormDialogProps) {
  const isEdit = card !== undefined;
  const isDraft = draftEdit !== undefined;
  const initial = draftEdit?.draft ?? card;
  const [front, setFront] = useState(initial?.front ?? "");
  const [back, setBack] = useState(initial?.back ?? "");
  const createMutation = useCreateCard(deckId);
  const updateMutation = useUpdateCard();
  const draftMutation = useMutation({
    mutationFn: async (changes: DraftUpdate) => draftEdit?.onSubmit(changes),
  });
  const mutation = isDraft ? draftMutation : isEdit ? updateMutation : createMutation;
  const frontRef = useRef<HTMLTextAreaElement>(null);
  const frontId = useId();
  const backId = useId();

  function close() {
    setFront(initial?.front ?? "");
    setBack(initial?.back ?? "");
    mutation.reset();
    onOpenChange(false);
  }

  function handleOpenChange(next: boolean) {
    if (next) {
      onOpenChange(true);
      return;
    }
    if (mutation.isPending) return;
    close();
  }

  async function save(addAnother: boolean) {
    if (!canSubmit) return;
    if (addAnother && document.activeElement !== frontRef.current) {
      frontRef.current?.focus();
    }
    const data = { front: front.trim(), back: back.trim() };
    try {
      if (isDraft) {
        const changes: DraftUpdate = {};
        if (data.front !== draftEdit.draft.front) changes.front = data.front;
        if (data.back !== draftEdit.draft.back) changes.back = data.back;
        if (Object.keys(changes).length > 0) {
          await draftMutation.mutateAsync(changes);
        }
      } else if (isEdit) {
        const changes: CardUpdate = {};
        if (data.front !== card.front) changes.front = data.front;
        if (data.back !== card.back) changes.back = data.back;
        if (Object.keys(changes).length > 0) {
          await updateMutation.mutateAsync({ cardId: card.id, data: changes });
        }
      } else {
        await createMutation.mutateAsync(data);
      }
    } catch {
      return;
    }
    if (addAnother) {
      setFront("");
      setBack("");
      frontRef.current?.focus();
      return;
    }
    close();
  }

  function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    void save(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      e.currentTarget.form?.requestSubmit();
    }
  }

  function keepFocus(e: React.PointerEvent | React.MouseEvent) {
    e.preventDefault();
  }

  const canSubmit = front.trim() !== "" && back.trim() !== "" && !mutation.isPending;

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={dialog.overlay} />
        <Dialog.Content
          className={`${dialog.content} ${styles.content}`}
          onFocus={scrollFieldIntoView}
        >
          <header className={styles.header}>
            <Dialog.Title className={styles.title}>
              {isDraft ? "Edit draft" : isEdit ? "Edit card" : "Add card"}
            </Dialog.Title>
            <Dialog.Description className={styles.subtitle}>
              {isDraft
                ? "Edited drafts are kept when you regenerate."
                : isEdit
                  ? "Change the question or the answer."
                  : "Put the question on the front and the answer on the back."}
            </Dialog.Description>
          </header>

          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.field}>
              <label htmlFor={frontId} className={styles.label}>
                Front
              </label>
              <textarea
                ref={frontRef}
                id={frontId}
                className={styles.textarea}
                value={front}
                onChange={(e) => {
                  if (!mutation.isPending) setFront(e.target.value);
                }}
                onKeyDown={handleKeyDown}
                required
              />
            </div>

            <div className={styles.field}>
              <label htmlFor={backId} className={styles.label}>
                Back
              </label>
              <textarea
                id={backId}
                className={styles.textarea}
                value={back}
                onChange={(e) => {
                  if (!mutation.isPending) setBack(e.target.value);
                }}
                onKeyDown={handleKeyDown}
                required
              />
            </div>

            {mutation.isError && (
              <p role="alert" className={styles.error}>
                {getErrorMessage(mutation.error)}
              </p>
            )}

            <div className={styles.actions}>
              <Dialog.Close asChild>
                <button type="button" className={styles.secondary} disabled={mutation.isPending}>
                  Cancel
                </button>
              </Dialog.Close>
              {!isEdit && !isDraft && (
                <button
                  type="button"
                  className={styles.secondary}
                  disabled={!canSubmit}
                  onPointerDown={keepFocus}
                  onMouseDown={keepFocus}
                  onClick={() => save(true)}
                >
                  Save and add another
                </button>
              )}
              <button type="submit" className={styles.primary} disabled={!canSubmit}>
                {mutation.isPending ? "Saving..." : isEdit || isDraft ? "Save changes" : "Save"}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
