import * as Dialog from "@radix-ui/react-dialog";
import { useId, useState } from "react";
import { useCreateDeck } from "../../hooks/useCreateDeck";
import { useUpdateDeck } from "../../hooks/useUpdateDeck";
import { getErrorMessage } from "../../services/errors";
import type { Deck, DeckUpdate } from "../../types/models";
import { scrollFieldIntoView } from "../../utils/scrollFieldIntoView";
import dialog from "../common/Dialog.module.css";
import styles from "./DeckFormDialog.module.css";

type DeckFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deck?: Deck;
};

export function DeckFormDialog({ open, onOpenChange, deck }: DeckFormDialogProps) {
  const isEdit = deck !== undefined;
  const [name, setName] = useState(deck?.name ?? "");
  const [description, setDescription] = useState(deck?.description ?? "");
  const createMutation = useCreateDeck();
  const updateMutation = useUpdateDeck();
  const mutation = isEdit ? updateMutation : createMutation;
  const nameId = useId();
  const descriptionId = useId();

  function close() {
    setName(deck?.name ?? "");
    setDescription(deck?.description ?? "");
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

  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit) return;
    const data = { name: name.trim(), description: description.trim() || null };
    try {
      if (isEdit) {
        const changes: DeckUpdate = {};
        if (data.name !== deck.name) changes.name = data.name;
        if (data.description !== deck.description) changes.description = data.description;
        if (Object.keys(changes).length > 0) {
          await updateMutation.mutateAsync({ deckId: deck.id, data: changes });
        }
      } else {
        await createMutation.mutateAsync(data);
      }
    } catch {
      return;
    }
    close();
  }

  const canSubmit = name.trim() !== "" && !mutation.isPending;

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
              {isEdit ? "Edit deck" : "New deck"}
            </Dialog.Title>
            <Dialog.Description className={styles.subtitle}>
              {isEdit
                ? "Rename the deck or change its description."
                : "Give it a name. You can add cards next."}
            </Dialog.Description>
          </header>

          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.field}>
              <label htmlFor={nameId} className={styles.label}>
                Name
              </label>
              <input
                id={nameId}
                className={styles.input}
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="off"
                required
              />
            </div>

            <div className={styles.field}>
              <label htmlFor={descriptionId} className={styles.label}>
                Description <span className={styles.optional}>(optional)</span>
              </label>
              <textarea
                id={descriptionId}
                className={styles.textarea}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
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
              <button type="submit" className={styles.primary} disabled={!canSubmit}>
                {isEdit
                  ? mutation.isPending
                    ? "Saving..."
                    : "Save changes"
                  : mutation.isPending
                    ? "Creating..."
                    : "Create deck"}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
