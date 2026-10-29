import { createBrowserRouter, Navigate } from "react-router";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { RequireAuth } from "./components/RequireAuth";
import { RedirectIfAuthed } from "./components/RedirectIfAuthed";
import AppLayout from "./components/AppLayout";
import {
  DeckPage,
  GeneratePage,
  GenerationPage,
  PracticePage,
  QuizPage,
  RegisterPage,
  ReviewPage,
  ReviewPickerPage,
} from "./lazyPages";

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
          { path: "/generate", element: <GeneratePage /> },
          { path: "/generations/:generationId", element: <GenerationPage /> },
        ],
      },
      { path: "/decks/:deckId/review", element: <ReviewPage /> },
      { path: "/decks/:deckId/practice", element: <PracticePage /> },
      { path: "/decks/:deckId/quiz", element: <QuizPage /> },
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
