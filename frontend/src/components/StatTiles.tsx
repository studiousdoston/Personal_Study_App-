import { CheckCheck, Clock, Flame, Target } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useStats } from "../hooks/useStats";
import { getErrorMessage } from "../services/errors";
import styles from "./StatTiles.module.css";

type TileProps = {
  label: string;
  value: string;
  unit?: string;
  note: string;
  icon: LucideIcon;
  accent?: boolean;
};

function Tile({ label, value, unit, note, icon: Icon, accent = false }: TileProps) {
  return (
    <div className={styles.tile}>
      <div className={styles.top}>
        <span className={styles.label}>{label}</span>
        <Icon size={18} aria-hidden="true" className={accent ? styles.iconAccent : styles.icon} />
      </div>
      <p className={accent ? `${styles.value} ${styles.valueAccent}` : styles.value}>
        {value}
        {unit && <span className={styles.unit}>{unit}</span>}
      </p>
      <p className={styles.note}>{note}</p>
    </div>
  );
}

export function StatTiles() {
  const { data, isPending, isError, error } = useStats();

  if (isError) {
    return <p className={styles.error}>{getErrorMessage(error)}</p>;
  }

  const placeholder = "–";
  const accuracy =
    data?.accuracy_30d == null ? placeholder : String(Math.round(data.accuracy_30d * 100));

  return (
    <section className={styles.grid} aria-label="Your stats" aria-busy={isPending}>
      <Tile
        label="Due now"
        value={data ? String(data.cards_due) : placeholder}
        unit="cards"
        note={data && data.cards_due > 0 ? "Ready for review" : "All caught up"}
        icon={Clock}
      />
      <Tile
        label="Reviewed"
        value={data ? String(data.reviews_today) : placeholder}
        unit="today"
        note="Cards rated today"
        icon={CheckCheck}
      />
      <Tile
        label="Streak"
        value={data ? String(data.streak_days) : placeholder}
        unit="days"
        note="Days in a row"
        icon={Flame}
        accent
      />
      <Tile
        label="Accuracy"
        value={accuracy}
        unit={accuracy === placeholder ? undefined : "%"}
        note="Last 30 days"
        icon={Target}
      />
    </section>
  );
}
