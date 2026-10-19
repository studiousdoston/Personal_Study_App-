import { CheckCheck, Clock, Flame, Target } from "lucide-react";
import { useStats } from "../../hooks/useStats";
import { getErrorMessage } from "../../services/errors";
import { pluralWord } from "../../utils/plural";
import styles from "./StatTiles.module.css";
import { Tile } from "./Tile";

export function StatTiles() {
  const { data, isPending, isError, error } = useStats();

  if (isError) {
    return <p className={styles.error}>{getErrorMessage(error)}</p>;
  }

  const placeholder = "–";
  const accuracy =
    data?.accuracy_30d == null ? placeholder : String(Math.round(data.accuracy_30d * 100));

  return (
    <section className={styles.grid} aria-label="Your stats" aria-busy={isPending}>
      <Tile
        label="Due now"
        value={data ? String(data.cards_due) : placeholder}
        unit={pluralWord(data?.cards_due ?? 0, "card")}
        note={data && data.cards_due > 0 ? "Ready for review" : "All caught up"}
        icon={Clock}
      />
      <Tile
        label="Reviewed"
        value={data ? String(data.reviews_today) : placeholder}
        unit="today"
        note="Cards rated today"
        icon={CheckCheck}
      />
      <Tile
        label="Streak"
        value={data ? String(data.streak_days) : placeholder}
        unit={pluralWord(data?.streak_days ?? 0, "day")}
        note="Days in a row"
        icon={Flame}
        accent
      />
      <Tile
        label="Accuracy"
        value={accuracy}
        unit={accuracy === placeholder ? undefined : "%"}
        note="Last 30 days"
        icon={Target}
      />
    </section>
  );
}
