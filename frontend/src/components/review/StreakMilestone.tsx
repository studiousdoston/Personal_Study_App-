import { useEffect, useRef, useState } from "react";
import { useStats } from "../../hooks/useStats";
import { fireConfetti } from "../../utils/confetti";
import {
  checkStreakMilestone,
  readCelebratedStreak,
  saveCelebratedStreak,
} from "../../utils/streakMilestone";
import styles from "./StreakMilestone.module.css";

export function StreakMilestone() {
  const stats = useStats();
  const [mountedAt] = useState(Date.now);
  const [celebratedBefore] = useState(readCelebratedStreak);
  const handled = useRef(false);

  const fresh = stats.isSuccess && !stats.isFetching && stats.dataUpdatedAt >= mountedAt;
  const result = fresh ? checkStreakMilestone(stats.data.streak_days, celebratedBefore) : null;

  useEffect(() => {
    if (!result || handled.current) return;
    handled.current = true;
    saveCelebratedStreak(result.celebrated);
    if (result.milestone) void fireConfetti("huge");
  }, [result]);

  return (
    <p className={styles.streak} role="status">
      {result?.milestone ? `🔥 ${result.milestone}-day streak` : ""}
    </p>
  );
}
