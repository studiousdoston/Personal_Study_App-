import { Navigate, Outlet } from "react-router";
import { useAuth } from "../context/useAuth";
import { AppSplash } from "./common/AppSplash";

export function RedirectIfAuthed() {
  const { status } = useAuth();

  if (status === "loading") {
    return <AppSplash />;
  }

  if (status === "authenticated") {
    return <Navigate to={"/"} replace />;
  }

  return <Outlet />;
}
