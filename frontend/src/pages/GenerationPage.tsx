import { Navigate, useParams } from "react-router";

import { GenerationNotFound } from "../components/generate/GenerationNotFound";
import { GenerationView } from "../components/generate/GenerationView";
import { isUuid } from "../utils/isUuid";

export function GenerationPage() {
  const { generationId } = useParams();
  if (!generationId) {
    return <Navigate to={"/"} replace />;
  }
  if (!isUuid(generationId)) {
    return <GenerationNotFound />;
  }
  return <GenerationView key={generationId} generationId={generationId} />;
}
