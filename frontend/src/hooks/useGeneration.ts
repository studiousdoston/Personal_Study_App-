import { useQuery } from "@tanstack/react-query";
import { getGeneration } from "../services/generation.service";
import { isNotFoundError } from "../services/errors";

const POLL_MS = 2000;

export function useGeneration(generationId: string) {
  return useQuery({
    queryKey: ["generations", generationId],
    queryFn: () => getGeneration(generationId),
    retry: (failureCount, error) => !isNotFoundError(error) && failureCount < 1,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "queued" || status === "running" ? POLL_MS : false;
    },
  });
}
