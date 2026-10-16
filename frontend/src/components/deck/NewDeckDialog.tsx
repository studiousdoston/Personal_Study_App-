import * as Dialog from "@radix-ui/react-dialog";
import { useId, useState } from "react";
import { useCreateDeck } from "../../hooks/useCreateDeck";
import { getErrorMessage } from "../../services/errors";
import styles from "./NewDeckDialog.module.css";

type NewDeckDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function NewDeckDialog({ open, onOpenChange }: NewDeckDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const mutation = useCreateDeck();
  const nameId = useId();
  const descriptionId = useId();

  function close() {
    setName("");
    setDescription("");
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
    try {
      await mutation.mutateAsync({
        name: name.trim(),
        description: description.trim() || null,
      });
    } catch {
      return;
    }
    close();
  }

  const canSubmit = name.trim() !== "" && !mutation.isPending;

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content className={styles.content}>
          <header className={styles.header}>
            <Dialog.Title className={styles.title}>New deck</Dialog.Title>
            <Dialog.Description className={styles.subtitle}>
              Give it a name. You can add cards next.
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
                {mutation.isPending ? "Creating..." : "Create deck"}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
