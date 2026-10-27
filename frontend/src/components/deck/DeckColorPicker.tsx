import * as RadioGroup from "@radix-ui/react-radio-group";
import { Check } from "lucide-react";
import { useId } from "react";
import { DECK_COLORS, type DeckColor } from "../../constants";
import { deckColorVar } from "../../utils/deckColorVar";
import styles from "./DeckColorPicker.module.css";

type DeckColorPickerProps = {
  value: DeckColor;
  onChange: (color: DeckColor) => void;
};

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function DeckColorPicker({ value, onChange }: DeckColorPickerProps) {
  const labelId = useId();

  function handleValueChange(next: string) {
    const color = DECK_COLORS.find((c) => c === next);
    if (color) onChange(color);
  }

  return (
    <div className={styles.field}>
      <span id={labelId} className={styles.label}>
        Color
      </span>
      <RadioGroup.Root
        className={styles.row}
        value={value}
        onValueChange={handleValueChange}
        orientation="horizontal"
        aria-labelledby={labelId}
      >
        {DECK_COLORS.map((color) => (
          <RadioGroup.Item
            key={color}
            value={color}
            className={styles.swatch}
            style={{ "--swatch": deckColorVar(color) } as React.CSSProperties}
            aria-label={capitalize(color)}
          >
            <RadioGroup.Indicator className={styles.indicator}>
              <Check size={18} strokeWidth={3} aria-hidden />
            </RadioGroup.Indicator>
          </RadioGroup.Item>
        ))}
      </RadioGroup.Root>
    </div>
  );
}
