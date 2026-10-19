import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { useState } from "react";
import styles from "./ConfirmDialog.module.css";

type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  pendingLabel?: string;
  onConfirm: () => Promise<unknown>;
  error?: string;
};

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  pendingLabel = "Deleting...",
  onConfirm,
  error,
}: ConfirmDialogProps) {
  const [isPending, setIsPending] = useState(false);

  function handleOpenChange(next: boolean) {
    if (!next && isPending) return;
    onOpenChange(next);
  }

  async function handleConfirm() {
    setIsPending(true);
    try {
      await onConfirm();
    } catch {
      return;
    } finally {
      setIsPending(false);
    }
    onOpenChange(false);
  }

  return (
    <AlertDialog.Root open={open} onOpenChange={handleOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className={styles.overlay} />
        <AlertDialog.Content className={styles.content}>
          <header className={styles.header}>
            <AlertDialog.Title className={styles.title}>{title}</AlertDialog.Title>
            <AlertDialog.Description className={styles.description}>
              {description}
            </AlertDialog.Description>
          </header>

          {error && (
            <p role="alert" className={styles.error}>
              {error}
            </p>
          )}

          <div className={styles.actions}>
            <AlertDialog.Cancel asChild>
              <button type="button" className={styles.secondary} disabled={isPending}>
                Cancel
              </button>
            </AlertDialog.Cancel>
            <button
              type="button"
              className={styles.danger}
              disabled={isPending}
              onClick={handleConfirm}
            >
              {isPending ? pendingLabel : confirmLabel}
            </button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
