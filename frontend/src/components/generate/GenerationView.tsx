import { getErrorMessage, isNotFoundError } from "../../services/errors";
import { useGeneration } from "../../hooks/useGeneration";
import type { Generation } from "../../types/models";
import { plural } from "../../utils/plural";
import { ErrorBox } from "../common/ErrorBox";
import { DraftReview } from "./DraftReview";
import { GenerationEmpty } from "./GenerationEmpty";
import { GenerationFailed } from "./GenerationFailed";
import { GenerationHeader } from "./GenerationHeader";
import { GenerationNotFound } from "./GenerationNotFound";
import { GenerationProgress } from "./GenerationProgress";
import styles from "./GenerationView.module.css";

function statusText(job: Generation): string {
  const hasDrafts = job.drafts.length > 0;
  switch (job.status) {
    case "queued":
      return hasDrafts ? "Refining…" : "Starting…";
    case "running":
      return hasDrafts ? "Refining…" : "Writing your cards…";
    case "failed":
      return hasDrafts ? "Refine failed" : "Generation failed";
    case "done":
      return !hasDrafts
        ? "No cards could be made from these notes."
        : `${plural(job.drafts.length, "draft")} ready`;
  }
}

export function GenerationView({ generationId }: { generationId: string }) {
  const generation = useGeneration(generationId);
  const job = generation.data;

  if (generation.isError && isNotFoundError(generation.error)) {
    return <GenerationNotFound />;
  }
  if (!job) {
    return generation.isError ? (
      <ErrorBox message={getErrorMessage(generation.error)} onRetry={() => generation.refetch()} />
    ) : (
      <div className={styles.skeleton} aria-hidden="true" />
    );
  }

  return (
    <div className={styles.page}>
      <GenerationHeader generation={job} />
      <p className={styles.srOnly} aria-live="polite">
        {statusText(job)}
      </p>
      {job.drafts.length > 0 ? (
        <DraftReview generation={job} />
      ) : job.status === "queued" || job.status === "running" ? (
        <GenerationProgress status={job.status} />
      ) : job.status === "failed" ? (
        <GenerationFailed generation={job} />
      ) : (
        <GenerationEmpty deckId={job.deck_id} />
      )}
    </div>
  );
}
