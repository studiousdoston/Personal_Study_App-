import { Link } from "react-router";
import { RotateCcw } from "lucide-react";
import { useRefineGeneration } from "../../hooks/useRefineGeneration";
import { getErrorMessage } from "../../services/errors";
import type { Generation } from "../../types/models";
import { Spinner } from "../common/Spinner";
import styles from "./GenerationFailed.module.css";

export function GenerationFailed({ generation }: { generation: Generation }) {
  const refine = useRefineGeneration(generation.id);
  const canRetry = generation.refines_left > 0;

  function retry() {
    if (refine.isPending) return;
    refine.mutate(generation.instructions);
  }

  return (
    <div className={styles.panel}>
      <p className={styles.title}>Generation failed</p>
      <p>{generation.error_message ?? "Something went wrong"}</p>
      {refine.isError && <p role="alert">{getErrorMessage(refine.error)}</p>}
      <div className={styles.actions}>
        {canRetry && (
          <button
            type="button"
            className={styles.retry}
            onClick={retry}
            aria-busy={refine.isPending}
          >
            {refine.isPending ? <Spinner /> : <RotateCcw size={18} aria-hidden="true" />}
            Try again
          </button>
        )}
        <Link to={`/decks/${generation.deck_id}`} className={styles.link}>
          Back to deck
        </Link>
      </div>
    </div>
  );
}
