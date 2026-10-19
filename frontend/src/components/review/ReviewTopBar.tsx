import { Link } from "react-router";
import { X } from "lucide-react";
import styles from "./ReviewTopBar.module.css";

type ReviewTopBarProps = {
  exitTo: string;
  deckName?: string;
  progress?: { done: number; total: number };
  badge?: string;
};

export function ReviewTopBar({ exitTo, deckName, progress, badge }: ReviewTopBarProps) {
  const percent = progress && progress.total > 0 ? (progress.done / progress.total) * 100 : 0;

  return (
    <header className={styles.bar}>
      <div className={styles.row}>
        <Link to={exitTo} className={styles.close} aria-label="End session">
          <X size={22} aria-hidden="true" />
        </Link>
        <p className={styles.name}>{deckName}</p>
        {badge && (
          <span className={styles.badge} title="Doesn't change your review schedule.">
            {badge}
          </span>
        )}
        {progress && (
          <p className={styles.count}>
            {progress.done} / {progress.total}
          </p>
        )}
      </div>
      {progress && (
        <div
          className={styles.track}
          role="progressbar"
          aria-label="Session progress"
          aria-valuemin={0}
          aria-valuemax={progress.total}
          aria-valuenow={progress.done}
        >
          <div className={styles.fill} style={{ width: `${percent}%` }} />
        </div>
      )}
    </header>
  );
}
