import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { CheckCircle2, X } from "lucide-react";
import { readFlash } from "../../utils/flashState";
import styles from "./FlashMessage.module.css";

export function FlashMessage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [message, setMessage] = useState(() => readFlash(location.state));

  useEffect(() => {
    if (readFlash(location.state) !== null) {
      navigate(`${location.pathname}${location.search}`, { replace: true, state: null });
    }
  }, [location, navigate]);

  if (message === null) return null;

  return (
    <div className={styles.flash} role="status">
      <CheckCircle2 size={18} aria-hidden="true" />
      <p className={styles.text}>{message}</p>
      <button
        type="button"
        className={styles.close}
        aria-label="Dismiss"
        onClick={() => setMessage(null)}
      >
        <X size={18} aria-hidden="true" />
      </button>
    </div>
  );
}
