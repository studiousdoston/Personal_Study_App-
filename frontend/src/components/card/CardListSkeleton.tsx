import styles from "./CardListSkeleton.module.css";

export function CardListSkeleton() {
  return (
    <div className={styles.skeletonList} aria-hidden="true">
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className={`${styles.skeleton} ${styles.skeletonRow}`} />
      ))}
    </div>
  );
}
