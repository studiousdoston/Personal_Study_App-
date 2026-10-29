import { type ReactNode, useEffect, useRef, useState } from "react";
import { getResultLevel, pickResultMessage } from "../../utils/resultLevel";
import styles from "./ResultHeading.module.css";

type ResultHeadingProps = {
  title: string;
  correct: number;
  total: number;
  showNumbers?: boolean;
  children?: ReactNode;
};

export function ResultHeading({
  title,
  correct,
  total,
  showNumbers = false,
  children,
}: ResultHeadingProps) {
  const heading = useRef<HTMLHeadingElement>(null);
  const [result] = useState(() => {
    const level = getResultLevel(correct, total);
    return level ? { level, message: pickResultMessage(level) } : null;
  });
  const percent = total === 0 ? 0 : Math.round((correct / total) * 100);
  const celebrate =
    result?.level === "perfect" || result?.level === "outstanding" || result?.level === "excellent";

  useEffect(() => {
    heading.current?.focus();
  }, []);

  return (
    <div className={styles.result}>
      <h1 ref={heading} tabIndex={-1} className={styles.heading}>
        <span className={styles.title}>{title}</span>
        {result && (
          <span className={`${styles.message} ${celebrate ? styles.celebrate : ""}`}>
            {result.message}
          </span>
        )}
      </h1>
      {showNumbers && total > 0 && (
        <p className={styles.numbers}>
          {correct} of {total} · {percent}%
        </p>
      )}
      {children}
    </div>
  );
}
