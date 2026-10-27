import styles from "./Spinner.module.css";

export function Spinner({ size = 18 }: { size?: number }) {
  return (
    <span
      className={styles.spinner}
      style={{ "--spinner-size": `${size}px` } as React.CSSProperties}
      aria-hidden="true"
    />
  );
}
