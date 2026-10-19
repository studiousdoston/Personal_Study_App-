import type { Rating } from "../../hooks/useReviewSession";
import styles from "./RatingButtons.module.css";

const RATING_OPTIONS: { rating: Rating; label: string; className: string }[] = [
  { rating: 1, label: "Again", className: styles.again },
  { rating: 3, label: "Hard", className: styles.hard },
  { rating: 4, label: "Good", className: styles.good },
  { rating: 5, label: "Easy", className: styles.easy },
];

type RatingButtonsProps = {
  onRate: (rating: Rating) => void;
  disabled: boolean;
};

export function RatingButtons({ onRate, disabled }: RatingButtonsProps) {
  return (
    <div className={styles.grid} role="group" aria-label="How well did you remember?">
      {RATING_OPTIONS.map((option) => (
        <button
          key={option.rating}
          type="button"
          className={`${styles.button} ${option.className}`}
          disabled={disabled}
          onClick={() => onRate(option.rating)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
