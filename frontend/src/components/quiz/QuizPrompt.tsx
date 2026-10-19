import styles from "./QuizPrompt.module.css";

export function QuizPrompt({ prompt }: { prompt: string }) {
  return (
    <section className={styles.card} aria-label="Question">
      <span className={styles.label}>Question</span>
      <h1 className={styles.prompt}>{prompt}</h1>
    </section>
  );
}
