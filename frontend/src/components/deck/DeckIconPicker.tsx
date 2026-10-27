import * as RadioGroup from "@radix-ui/react-radio-group";
import { useId } from "react";
import { DECK_ICONS, type DeckColor, type DeckIcon } from "../../constants";
import { deckColorVar } from "../../utils/deckColorVar";
import { DECK_ICON_COMPONENTS } from "./deckIcons";
import styles from "./DeckIconPicker.module.css";

type DeckIconPickerProps = {
  value: DeckIcon;
  color: DeckColor;
  onChange: (icon: DeckIcon) => void;
};

function iconLabel(icon: DeckIcon): string {
  const words = icon.replaceAll("-", " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function DeckIconPicker({ value, color, onChange }: DeckIconPickerProps) {
  const labelId = useId();

  function handleValueChange(next: string) {
    const icon = DECK_ICONS.find((i) => i === next);
    if (icon) onChange(icon);
  }

  return (
    <div className={styles.field}>
      <span id={labelId} className={styles.label}>
        Icon
      </span>
      <RadioGroup.Root
        className={styles.grid}
        style={{ "--deck-color": deckColorVar(color) } as React.CSSProperties}
        value={value}
        onValueChange={handleValueChange}
        aria-labelledby={labelId}
      >
        {DECK_ICONS.map((icon) => {
          const Icon = DECK_ICON_COMPONENTS[icon];
          return (
            <RadioGroup.Item
              key={icon}
              value={icon}
              className={styles.item}
              aria-label={iconLabel(icon)}
            >
              <Icon size={22} aria-hidden />
            </RadioGroup.Item>
          );
        })}
      </RadioGroup.Root>
    </div>
  );
}
