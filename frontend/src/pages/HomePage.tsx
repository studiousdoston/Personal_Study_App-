import { useNavigate } from "react-router";
import { useAuth } from "../context/useAuth";

export function HomePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <main>
      <h1>Home</h1>
      <p>Logged in as {user?.email}</p>
      <button onClick={handleLogout}>Log out</button>
    </main>
  );
}
