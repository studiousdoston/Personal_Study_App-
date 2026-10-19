import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "./styles/global.css";
import { AuthProvider } from "./context/AuthProvider.tsx";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router";
import { router } from "./router.tsx";
import { UpdateBanner } from "./components/common/UpdateBanner.tsx";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
        <UpdateBanner />
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
);
