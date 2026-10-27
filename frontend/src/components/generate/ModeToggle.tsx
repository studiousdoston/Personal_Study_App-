import * as RadioGroup from "@radix-ui/react-radio-group";
import { useId } from "react";
import type { GenerationMode } from "../../types/models";
import styles from "./ModeToggle.module.css";

const MODES: { value: GenerationMode; label: string }[] = [
  { value: "qa", label: "Q&A" },
  { value: "vocab", label: "Vocabulary" },
];

type ModeToggleProps = {
  value: GenerationMode;
  onChange: (mode: GenerationMode) => void;
};

export function ModeToggle({ value, onChange }: ModeToggleProps) {
  const labelId = useId();

  function handleValueChange(next: string) {
    const mode = MODES.find((m) => m.value === next);
    if (mode) onChange(mode.value);
  }

  return (
    <div className={styles.field}>
      <span id={labelId} className={styles.label}>
        Card type
      </span>
      <RadioGroup.Root
        className={styles.segmented}
        value={value}
        onValueChange={handleValueChange}
        orientation="horizontal"
        aria-labelledby={labelId}
      >
        {MODES.map((mode) => (
          <RadioGroup.Item key={mode.value} value={mode.value} className={styles.segment}>
            {mode.label}
          </RadioGroup.Item>
        ))}
      </RadioGroup.Root>
    </div>
  );
}
