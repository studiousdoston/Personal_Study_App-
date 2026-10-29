import { Suspense } from "react";
import { Outlet, useLocation } from "react-router";
import { ChunkErrorBoundary } from "./ChunkErrorBoundary";
import { PageFallback } from "./PageFallback";

export function RouteOutlet() {
  const { pathname } = useLocation();
  return (
    <ChunkErrorBoundary resetKey={pathname}>
      <Suspense fallback={<PageFallback />}>
        <Outlet />
      </Suspense>
    </ChunkErrorBoundary>
  );
}
// <Outlet /> plus a loading spinner for lazy pages and a reload for stale chunks
