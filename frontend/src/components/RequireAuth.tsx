import { Navigate, useLocation } from "react-router";
import { useAuth } from "../context/useAuth";
import { AppSplash } from "./common/AppSplash";
import { RouteOutlet } from "./common/RouteOutlet";

export function RequireAuth() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === "loading") {
    return <AppSplash />;
  }

  if (status === "unauthenticated") {
    return <Navigate to={"/login"} replace state={{ from: location.pathname }} />;
    // Not logged in → go to /login, and remember where they wanted to go
    // (state.from), so the login page can send them back there afterwards.
  }

  return <RouteOutlet />;
}
