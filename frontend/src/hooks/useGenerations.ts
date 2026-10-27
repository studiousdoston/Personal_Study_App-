import { useQuery } from "@tanstack/react-query";
import { listGenerations } from "../services/generation.service";

const POLL_MS = 3000;

export function useGenerations() {
  return useQuery({
    queryKey: ["generations", "list"],
    queryFn: listGenerations,
    staleTime: 0,
    refetchInterval: (query) =>
      query.state.data?.some((job) => job.status === "queued" || job.status === "running")
        ? POLL_MS
        : false,
  });
}
