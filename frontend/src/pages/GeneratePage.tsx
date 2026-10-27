import { useSearchParams } from "react-router";

import { GenerateView } from "../components/generate/GenerateView";

export function GeneratePage() {
  const [searchParams] = useSearchParams();
  return <GenerateView initialDeckId={searchParams.get("deck")} />;
}
