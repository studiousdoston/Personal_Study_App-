export const STREAK_STORAGE_KEY = "brainmaxx-streak-celebrated";
export const STREAK_MILESTONES = [7, 30, 50, 100, 200, 365];

export function readCelebratedStreak() {
  try {
    const value = Number(localStorage.getItem(STREAK_STORAGE_KEY));
    return Number.isFinite(value) && value > 0 ? value : 0;
  } catch {
    return 0;
  }
}

export function saveCelebratedStreak(value: number) {
  try {
    localStorage.setItem(STREAK_STORAGE_KEY, String(value));
  } catch {
    // storage unavailable; a milestone may be celebrated again after reload
  }
}

export function checkStreakMilestone(streak: number, celebrated: number) {
  if (STREAK_MILESTONES.includes(streak) && streak > celebrated) {
    return { milestone: streak, celebrated: streak };
  }
  if (streak < celebrated) {
    const reached = STREAK_MILESTONES.filter((m) => m <= streak);
    return { milestone: null, celebrated: reached.at(-1) ?? 0 };
  }
  return { milestone: null, celebrated };
}
