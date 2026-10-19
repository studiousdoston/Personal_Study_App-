import type { LucideIcon } from "lucide-react";
import styles from "./Tile.module.css";

type TileProps = {
  label: string;
  value: string;
  unit?: string;
  note: string;
  icon: LucideIcon;
  accent?: boolean;
};

export function Tile({ label, value, unit, note, icon: Icon, accent = false }: TileProps) {
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
