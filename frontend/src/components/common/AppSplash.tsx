import styles from "./AppSplash.module.css";

export function AppSplash() {
  return (
    <div className={styles.splash} role="status">
      <div className={styles.content}>
        <img src="/favicon.svg" alt="" width={80} height={80} className={styles.logo} />
        <span className={styles.name}>BrainMaxx</span>
        <span className={styles.spinner} aria-hidden="true" />
      </div>
      <span className={styles.srOnly}>Loading BrainMaxx…</span>
    </div>
  );
}
