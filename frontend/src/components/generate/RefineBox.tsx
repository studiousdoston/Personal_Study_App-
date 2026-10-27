import { useId, useState } from "react";
import { RefreshCw } from "lucide-react";
import { AI_MAX_INSTRUCTIONS } from "../../constants";
import { useRefineGeneration } from "../../hooks/useRefineGeneration";
import { getErrorMessage } from "../../services/errors";
import type { Generation } from "../../types/models";
import { Spinner } from "../common/Spinner";
import styles from "./RefineBox.module.css";

export function RefineBox({ generation }: { generation: Generation }) {
  const [instructions, setInstructions] = useState(generation.instructions ?? "");
  const refine = useRefineGeneration(generation.id);
  const inputId = useId();

  if (generation.refines_left === 0) {
    return <p className={styles.none}>No refines left for this batch.</p>;
  }

  function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (refine.isPending) return;
    refine.mutate(instructions.trim() || null);
  }

  return (
    <form className={styles.box} onSubmit={handleSubmit}>
      <label htmlFor={inputId} className={styles.label}>
        Not quite right? Regenerate
      </label>
      <div className={styles.row}>
        <input
          id={inputId}
          className={styles.input}
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          maxLength={AI_MAX_INSTRUCTIONS}
          placeholder="e.g. make them harder"
          autoComplete="off"
        />
        <button type="submit" className={styles.button} aria-busy={refine.isPending}>
          {refine.isPending ? <Spinner /> : <RefreshCw size={18} aria-hidden="true" />}
          Regenerate
          <span className={styles.left}>{generation.refines_left} left</span>
        </button>
      </div>
      <p className={styles.hint}>Edited cards are kept. Unticked ones won’t come back.</p>
      {refine.isError && (
        <p role="alert" className={styles.error}>
          {getErrorMessage(refine.error)}
        </p>
      )}
    </form>
  );
}
