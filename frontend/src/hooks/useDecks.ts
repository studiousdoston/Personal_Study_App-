import { useQuery } from "@tanstack/react-query";
import { listDecks } from "../services/deck.service";

export function useDecks() {
  return useQuery({
    queryKey: ["decks"],
    queryFn: listDecks,
  });
}
