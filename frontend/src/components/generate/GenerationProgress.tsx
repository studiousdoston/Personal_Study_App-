import { Spinner } from "../common/Spinner";
import styles from "./GenerationProgress.module.css";

export function GenerationProgress({ status }: { status: "queued" | "running" }) {
  return (
    <div className={styles.panel}>
      <div className={styles.status}>
        <Spinner size={22} />
        <p>{status === "queued" ? "Starting…" : "Writing your cards…"}</p>
      </div>
      <p className={styles.hint}>You can leave this page, your drafts will be saved.</p>
    </div>
  );
}
