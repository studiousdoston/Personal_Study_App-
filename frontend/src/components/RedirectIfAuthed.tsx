import { Navigate } from "react-router";
import { useAuth } from "../context/useAuth";
import { AppSplash } from "./common/AppSplash";
import { RouteOutlet } from "./common/RouteOutlet";

export function RedirectIfAuthed() {
  const { status } = useAuth();

  if (status === "loading") {
    return <AppSplash />;
  }

  if (status === "authenticated") {
    return <Navigate to={"/"} replace />;
  }

  return <RouteOutlet />;
}
