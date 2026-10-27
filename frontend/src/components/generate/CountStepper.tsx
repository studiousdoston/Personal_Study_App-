import { Minus, Plus } from "lucide-react";
import { useId } from "react";
import { AI_MAX_CARDS } from "../../constants";
import styles from "./CountStepper.module.css";

type CountStepperProps = {
  value: number;
  onChange: (count: number) => void;
};

export function CountStepper({ value, onChange }: CountStepperProps) {
  const labelId = useId();

  return (
    <div className={styles.field}>
      <span id={labelId} className={styles.label}>
        How many cards
      </span>
      <div className={styles.stepper} role="group" aria-labelledby={labelId}>
        <button
          type="button"
          className={styles.button}
          aria-label="Fewer cards"
          disabled={value <= 1}
          onClick={() => onChange(Math.max(1, value - 1))}
        >
          <Minus size={18} aria-hidden="true" />
        </button>
        <output className={styles.value} aria-live="polite">
          {value}
        </output>
        <button
          type="button"
          className={styles.button}
          aria-label="More cards"
          disabled={value >= AI_MAX_CARDS}
          onClick={() => onChange(Math.min(AI_MAX_CARDS, value + 1))}
        >
          <Plus size={18} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
