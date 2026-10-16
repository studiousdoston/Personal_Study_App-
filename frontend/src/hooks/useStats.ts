import { useQuery } from "@tanstack/react-query";
import { getStats } from "../services/stats.service";

export function useStats() {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return useQuery({
    queryKey: ["stats", tz],
    queryFn: () => getStats(tz),
  });
}
