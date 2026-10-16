import { useNavigate } from "react-router";
import { useAuth } from "../context/useAuth";
import { useStats } from "../hooks/useStats";
import { useDecks } from "../hooks/useDecks";

export function HomePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const stats = useStats();
  const decks = useDecks();

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }
  return (
    <main>
      <h1>Home</h1>
      <p>Logged in as {user?.email}</p>
      <button onClick={handleLogout}>Log out</button>
      <pre>{stats.isPending ? "Loading stats..." : JSON.stringify(stats.data, null, 2)}</pre>
      <p>{decks.isPending ? "Loading decks..." : `${decks.data?.length ?? 0} decks`}</p>
    </main>
  );
}
