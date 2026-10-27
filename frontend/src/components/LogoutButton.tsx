import { useState } from "react";
import { LogOut } from "lucide-react";
import { useAuth } from "../context/useAuth";
import { getErrorMessage } from "../services/errors";
import { ConfirmDialog } from "./common/ConfirmDialog";
import styles from "./LogoutButton.module.css";

export function LogoutButton() {
  const { logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) setError(undefined);
  }

  async function handleConfirm() {
    setError(undefined);
    try {
      await logout();
    } catch (err) {
      setError(getErrorMessage(err));
      throw err;
    }
  }

  return (
    <>
      <button
        type="button"
        className={styles.iconButton}
        onClick={() => setOpen(true)}
        aria-label="Log out"
      >
        <LogOut size={20} aria-hidden="true" />
      </button>
      <ConfirmDialog
        open={open}
        onOpenChange={handleOpenChange}
        title="Log out?"
        description="You'll need to log in again on this device."
        confirmLabel="Log out"
        pendingLabel="Logging out…"
        onConfirm={handleConfirm}
        error={error}
      />
    </>
  );
}
