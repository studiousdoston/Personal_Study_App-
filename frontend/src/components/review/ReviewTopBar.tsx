import { Link } from "react-router";
import { Volume2, VolumeX, X } from "lucide-react";
import { useSoundEnabled } from "../../hooks/useSoundEnabled";
import styles from "./ReviewTopBar.module.css";

type ReviewTopBarProps = {
  exitTo: string;
  deckName?: string;
  progress?: { done: number; total: number };
  badge?: string;
};

export function ReviewTopBar({ exitTo, deckName, progress, badge }: ReviewTopBarProps) {
  const percent = progress && progress.total > 0 ? (progress.done / progress.total) * 100 : 0;
  const sound = useSoundEnabled();
  const SoundIcon = sound.enabled ? Volume2 : VolumeX;

  return (
    <header className={styles.bar}>
      <div className={styles.row}>
        <Link
          to={exitTo}
          className={`${styles.iconButton} ${styles.close}`}
          aria-label="End session"
        >
          <X size={22} aria-hidden="true" />
        </Link>
        <p className={styles.name}>{deckName}</p>
        {badge && (
          <span className={styles.badge} title="Doesn't change your review schedule.">
            {badge}
          </span>
        )}
        <div className={styles.end}>
          {progress && (
            <p className={styles.count}>
              {progress.done} / {progress.total}
            </p>
          )}
          <button
            type="button"
            className={`${styles.iconButton} ${styles.sound}`}
            aria-label="Mute sounds"
            aria-pressed={!sound.enabled}
            title={sound.enabled ? "Mute sounds" : "Turn sounds on"}
            onClick={sound.toggleSound}
          >
            <SoundIcon size={20} aria-hidden="true" />
          </button>
        </div>
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
