import { Link } from "react-router";
import type { Generation } from "../../types/models";
import { plural } from "../../utils/plural";
import styles from "./GenerationResult.module.css";

export function GenerationResult({ generation }: { generation: Generation }) {
  const { drafts } = generation;

  if (drafts.length === 0) {
    return (
      <div className={styles.empty}>
        <p>No cards could be made from these notes.</p>
        <Link to={`/generate?deck=${generation.deck_id}`} className={styles.primaryLink}>
          Try other notes
        </Link>
      </div>
    );
  }

  return (
    <section className={styles.result} aria-labelledby="drafts-heading">
      <h2 id="drafts-heading" className={styles.heading}>
        {plural(drafts.length, "draft")} ready
      </h2>
      <p className={styles.note}>Review and save are coming in the next update.</p>
      <ol className={styles.list}>
        {drafts.map((draft) => (
          <li key={draft.id} className={styles.draft}>
            <p className={styles.front}>{draft.front}</p>
            <p className={styles.back}>{draft.back}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
