import { Spinner } from "./Spinner";
import styles from "./PageFallback.module.css";

export function PageFallback() {
  return (
    <div className={styles.fallback} role="status">
      <Spinner size={28} />
      <span className={styles.srOnly}>Loading…</span>
    </div>
  );
}
