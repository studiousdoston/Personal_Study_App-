import { useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../context/useAuth";
import { StatTiles } from "../components/stats/StatTiles";
import { DeckGrid } from "../components/deck/DeckGrid";
import { NewDeckDialog } from "../components/deck/NewDeckDialog";

export function HomePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [newDeckOpen, setNewDeckOpen] = useState(false);

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
      <DeckGrid onCreate={() => setNewDeckOpen(true)} />
      <NewDeckDialog open={newDeckOpen} onOpenChange={setNewDeckOpen} />
    </main>
  );
}
