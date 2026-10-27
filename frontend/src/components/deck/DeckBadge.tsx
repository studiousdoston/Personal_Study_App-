import { createElement } from "react";
import { deckColorVar } from "../../utils/deckColorVar";
import { getDeckIcon } from "./deckIcons";
import styles from "./DeckBadge.module.css";

type DeckBadgeSize = "sm" | "md" | "lg";

type DeckBadgeProps = {
  color: string;
  icon: string;
  size: DeckBadgeSize;
  className?: string;
};

const ICON_SIZE: Record<DeckBadgeSize, number> = { sm: 18, md: 22, lg: 26 };

export function DeckBadge({ color, icon, size, className }: DeckBadgeProps) {
  return (
    <span
      className={`${styles.badge} ${styles[size]} ${className ?? ""}`}
      style={{ "--deck-color": deckColorVar(color) } as React.CSSProperties}
      aria-hidden="true"
    >
      {createElement(getDeckIcon(icon), { size: ICON_SIZE[size] })}
    </span>
  );
}
