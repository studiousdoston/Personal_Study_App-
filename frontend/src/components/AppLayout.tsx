import { NavLink, Outlet, useLocation } from "react-router";
import { BookOpen, Flame, Layers, LogOut, RotateCcw } from "lucide-react";
import { useAuth } from "../context/useAuth";
import { useStats } from "../hooks/useStats";
import styles from "./AppLayout.module.css";

function navClass({ isActive }: { isActive: boolean }) {
  return isActive ? `${styles.navLink} ${styles.active}` : styles.navLink;
}

export default function AppLayout() {
  const { logout } = useAuth();
  const { data: stats } = useStats();
  const { pathname } = useLocation();
  const inDecks = pathname === "/" || pathname.startsWith("/decks");
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <NavLink to="/" className={styles.brand}>
            <BookOpen size={22} aria-hidden="true" />
            <span>Study App</span>
          </NavLink>
          {/* logo + name, links back to Home */}

          <div className={styles.actions}>
            {stats && (
              <span className={styles.streak}>
                <Flame size={16} aria-hidden="true" />
                {stats.streak_days} days
              </span>
            )}
            {/* streak badge, only shown once stats have loaded */}

            <button
              type="button"
              className={styles.iconButton}
              onClick={logout}
              aria-label="Log out"
            >
              <LogOut size={20} aria-hidden="true" />
            </button>
            {/* icon-only button, so aria-label gives screen readers a name */}
          </div>
        </div>
      </header>

      <main className={styles.main}>
        <Outlet />
      </main>

      <nav className={styles.nav} aria-label="Main">
        <NavLink to="/" end className={() => navClass({ isActive: inDecks })}>
          <Layers size={22} aria-hidden="true" />
          <span>Decks</span>
        </NavLink>
        <NavLink to="/review" className={navClass}>
          <RotateCcw size={22} aria-hidden="true" />
          <span>Review</span>
        </NavLink>
      </nav>
    </div>
  );
}
