import { useRegisterSW } from "virtual:pwa-register/react";
import styles from "./UpdateBanner.module.css";

export function UpdateBanner() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) return null;

  return (
    <div className={styles.banner} role="status">
      <p className={styles.text}>A new version is available</p>
      <div className={styles.actions}>
        <button type="button" className={styles.later} onClick={() => setNeedRefresh(false)}>
          Later
        </button>
        <button type="button" className={styles.reload} onClick={() => updateServiceWorker()}>
          Reload
        </button>
      </div>
    </div>
  );
}
