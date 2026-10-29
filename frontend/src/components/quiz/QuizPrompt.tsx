import { CardContent } from "../common/CardContent";
import styles from "./QuizPrompt.module.css";

export function QuizPrompt({ prompt }: { prompt: string }) {
  return (
    <section className={styles.card} aria-labelledby="quiz-prompt-label">
      <h1 id="quiz-prompt-label" className={styles.label}>
        Question
      </h1>
      <div className={styles.prompt}>
        <CardContent markdown={prompt} variant="full" />
      </div>
    </section>
  );
}
