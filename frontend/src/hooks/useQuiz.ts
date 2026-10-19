import { useQuery } from "@tanstack/react-query";
import { getQuiz, QUIZ_QUESTION_COUNT } from "../services/quiz.service";
import { isNotFoundError } from "../services/errors";
import { shuffle } from "../utils/shuffle";

export function useQuiz(deckId: string, round: number) {
  return useQuery({
    queryKey: ["quiz", deckId, round],
    queryFn: async () => {
      const quiz = await getQuiz(deckId, QUIZ_QUESTION_COUNT);
      return { ...quiz, questions: shuffle(quiz.questions) };
    },
    staleTime: Infinity,
    gcTime: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: (failureCount, error) => !isNotFoundError(error) && failureCount < 1,
  });
}
