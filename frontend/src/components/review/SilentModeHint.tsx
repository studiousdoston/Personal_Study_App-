import { useEffect, useState } from "react";
import { BellOff, X } from "lucide-react";
import {
  dismissSilentHint,
  silentHintTimeLeft,
  silentModeSentence,
} from "../../utils/silentModeHint";
import styles from "./SilentModeHint.module.css";

export function SilentModeHint() {
  const [timeLeft] = useState(silentHintTimeLeft);
  const [visible, setVisible] = useState(timeLeft > 0);

  useEffect(() => {
    if (timeLeft === 0) return;
    const timer = setTimeout(() => setVisible(false), timeLeft);
    return () => clearTimeout(timer);
  }, [timeLeft]);

  if (!visible) return null;

  const close = () => {
    dismissSilentHint();
    setVisible(false);
  };

  return (
    <div className={styles.hint} role="status">
      <BellOff size={16} aria-hidden="true" className={styles.icon} />
      <p className={styles.text}>{silentModeSentence()}</p>
      <button type="button" className={styles.close} aria-label="Dismiss tip" onClick={close}>
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  );
}
