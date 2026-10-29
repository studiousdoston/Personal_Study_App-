import styles from "./ErrorBox.module.css";

export function ErrorBox({
  message,
  onRetry,
  retryLabel = "Try again",
}: {
  message: string;
  onRetry: () => void;
  retryLabel?: string;
}) {
  return (
    <div className={styles.error} role="alert">
      <p>{message}</p>
      <button type="button" className={styles.retry} onClick={onRetry}>
        {retryLabel}
      </button>
    </div>
  );
}
// one error look for both the deck and the cards. role="alert" = screen readers
// announce it when it appears
