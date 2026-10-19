import { createBrowserRouter, Navigate } from "react-router";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { DeckPage } from "./pages/DeckPage";
import { PracticePage } from "./pages/PracticePage";
import { ReviewPage } from "./pages/ReviewPage";
import { ReviewPickerPage } from "./pages/ReviewPickerPage";
import { RegisterPage } from "./pages/RegisterPage";
import { RequireAuth } from "./components/RequireAuth";
import { RedirectIfAuthed } from "./components/RedirectIfAuthed";
import AppLayout from "./components/AppLayout";

export const router = createBrowserRouter([
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: "/", element: <HomePage /> },
          { path: `/decks/:deckId`, element: <DeckPage /> },
          { path: "/review", element: <ReviewPickerPage /> },
        ],
      },
      { path: "/decks/:deckId/review", element: <ReviewPage /> },
      { path: "/decks/:deckId/practice", element: <PracticePage /> },
    ],
  },
  {
    element: <RedirectIfAuthed />,
    children: [
      { path: "/login", element: <LoginPage /> },
      { path: "/register", element: <RegisterPage /> },
    ],
  },

  { path: "/*", element: <Navigate to={"/"} replace /> },
]);
