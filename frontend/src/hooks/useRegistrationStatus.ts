import { useQuery } from "@tanstack/react-query";
import { getRegistrationStatus } from "../services/auth.service";

export function useRegistrationStatus() {
  return useQuery({
    queryKey: ["registration"],
    queryFn: getRegistrationStatus,
    staleTime: 60 * 60 * 1000,
  });
}
