import { Navigate, useParams } from "react-router";

import { GenerationView } from "../components/generate/GenerationView";

export function GenerationPage() {
  const { generationId } = useParams();
  if (!generationId) {
    return <Navigate to={"/"} replace />;
  }
  return <GenerationView key={generationId} generationId={generationId} />;
}
