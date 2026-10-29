import { Check, X } from "lucide-react";
import type { QuizQuestion } from "../../types/models";
import { markdownToPlainText } from "../../utils/markdownToPlainText";
import styles from "./QuizOptions.module.css";

type QuizOptionsProps = {
  options: QuizQuestion["options"];
  chosen: number | null;
  onPick: (index: number) => void;
};

export function QuizOptions({ options, chosen, onPick }: QuizOptionsProps) {
  const answered = chosen !== null;

  return (
    <div className={styles.list} role="group" aria-label="Answer options">
      {options.map((option, index) => {
        const showCorrect = answered && option.is_correct;
        const showWrong = answered && index === chosen && !option.is_correct;
        const state = showCorrect ? styles.correct : showWrong ? styles.wrong : "";

        return (
          <button
            key={index}
            type="button"
            className={`${styles.option} ${state} ${answered && !state ? styles.dimmed : ""}`}
            aria-disabled={answered}
            onClick={() => onPick(index)}
          >
            <span className={styles.key} aria-hidden="true">
              {index + 1}
            </span>
            <span className={styles.text}>{markdownToPlainText(option.text)}</span>
            {showCorrect && <Check size={20} className={styles.iconCorrect} aria-hidden="true" />}
            {showWrong && <X size={20} className={styles.iconWrong} aria-hidden="true" />}
            {showCorrect && <span className={styles.srOnly}>(correct answer)</span>}
            {showWrong && <span className={styles.srOnly}>(your answer, wrong)</span>}
          </button>
        );
      })}
    </div>
  );
}
