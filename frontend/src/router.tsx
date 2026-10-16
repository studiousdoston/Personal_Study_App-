import { createBrowserRouter, Navigate } from "react-router";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { RequireAuth } from "./components/RequireAuth";
import { RedirectIfAuthed } from "./components/RedirectIfAuthed";

export const router = createBrowserRouter([
  { element: <RequireAuth />, children: [{ path: "/", element: <HomePage /> }] },
  {
    element: <RedirectIfAuthed />,
    children: [
      { path: "/login", element: <LoginPage /> },
      { path: "/register", element: <RegisterPage /> },
    ],
  },

  { path: "/*", element: <Navigate to={"/"} replace /> },
]);
