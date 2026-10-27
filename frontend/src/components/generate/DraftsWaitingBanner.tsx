import { Link } from "react-router";
import { ChevronRight } from "lucide-react";
import { useDecks } from "../../hooks/useDecks";
import { useGenerations } from "../../hooks/useGenerations";
import type { GenerationSummary } from "../../types/models";
import { plural } from "../../utils/plural";
import { DeckBadge } from "../deck/DeckBadge";
import { Spinner } from "../common/Spinner";
import styles from "./DraftsWaitingBanner.module.css";

function isActive(job: GenerationSummary): boolean {
  return job.status === "queued" || job.status === "running";
}

function isWaiting(job: GenerationSummary): boolean {
  return isActive(job) || job.draft_count > 0;
}

export function DraftsWaitingBanner({ deckId }: { deckId?: string }) {
  const { data: jobs } = useGenerations();
  const { data: decks } = useDecks();

  const waiting = (jobs ?? []).filter(
    (job) => isWaiting(job) && (deckId === undefined || job.deck_id === deckId),
  );
  const newest = waiting[0];
  if (!newest) return null;

  const deck = decks?.find((d) => d.id === newest.deck_id);
  const deckName = deck?.name ?? "your deck";
  const running = waiting.length === 1 && isActive(newest);

  const text = running
    ? `Writing cards for ${deckName}…`
    : waiting.length === 1
      ? `${plural(newest.draft_count, "draft")} waiting in ${deckName}`
      : `${waiting.length} batches of drafts waiting`;

  return (
    <Link to={`/generations/${newest.id}`} className={styles.banner}>
      {deck && <DeckBadge color={deck.color} icon={deck.icon} size="sm" />}
      <span className={styles.text}>{text}</span>
      {running ? (
        <Spinner />
      ) : (
        <span className={styles.action}>
          Review
          <ChevronRight size={18} aria-hidden="true" />
        </span>
      )}
    </Link>
  );
}
