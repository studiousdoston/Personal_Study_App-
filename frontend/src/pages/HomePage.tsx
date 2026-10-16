import { useNavigate } from "react-router";
import { useAuth } from "../context/useAuth";
import { useDecks } from "../hooks/useDecks";
import { StatTiles } from "../components/StatTiles";

export function HomePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
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
      <StatTiles />
      <p>{decks.isPending ? "Loading decks..." : `${decks.data?.length ?? 0} decks`}</p>
    </main>
  );
}
