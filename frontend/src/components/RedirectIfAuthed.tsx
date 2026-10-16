import { Navigate, Outlet } from "react-router";
import { useAuth } from "../context/useAuth";

export function RedirectIfAuthed() {
  const { status } = useAuth();

  if (status === "loading") {
    return <p>Loading...</p>;
  }

  if (status === "authenticated") {
    return <Navigate to={"/"} replace />;
  }

  return <Outlet />;
}
