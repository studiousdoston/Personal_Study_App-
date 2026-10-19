import { Search } from "lucide-react";
import { plural } from "../../utils/plural";
import styles from "./CardFilters.module.css";

type CardFiltersProps = {
  query: string;
  dueOnly: boolean;
  onQueryChange: (query: string) => void;
  onDueOnlyChange: (dueOnly: boolean) => void;
  shown: number;
  total: number;
  active: boolean;
};

export function CardFilters({
  query,
  dueOnly,
  onQueryChange,
  onDueOnlyChange,
  shown,
  total,
  active,
}: CardFiltersProps) {
  return (
    <div>
      <div className={styles.row}>
        <div className={styles.search}>
          <label htmlFor="card-search" className={styles.visuallyHidden}>
            Search cards
          </label>
          <Search size={18} aria-hidden="true" className={styles.searchIcon} />
          <input
            id="card-search"
            type="search"
            className={styles.input}
            placeholder="Search cards…"
            autoComplete="off"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape" && query !== "") {
                event.preventDefault();
                onQueryChange("");
              }
            }}
          />
        </div>
        <button
          type="button"
          className={styles.toggle}
          aria-pressed={dueOnly}
          onClick={() => onDueOnlyChange(!dueOnly)}
        >
          Due only
        </button>
      </div>
      <p className={styles.status} aria-live="polite">
        {active ? `Showing ${shown} of ${plural(total, "card")}` : ""}
      </p>
    </div>
  );
}
