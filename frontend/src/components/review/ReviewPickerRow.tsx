import { Link } from "react-router";
import { ChevronRight } from "lucide-react";
import { REVIEW_PICKER_PATH } from "../../hooks/useReviewExit";
import type { Deck } from "../../types/models";
import { firstChar } from "../../utils/firstChar";
import styles from "./ReviewPickerRow.module.css";

export function ReviewPickerRow({ deck }: { deck: Deck }) {
  return (
    <li>
      <Link
        to={`/decks/${deck.id}/review`}
        state={{ from: REVIEW_PICKER_PATH }}
        className={styles.row}
      >
        <span className={styles.avatar} aria-hidden="true">
          {firstChar(deck.name)}
        </span>
        <span className={styles.name}>{deck.name}</span>
        <span className={styles.pill}>{deck.due_count} due</span>
        <ChevronRight size={20} className={styles.chevron} aria-hidden="true" />
      </Link>
    </li>
  );
}
