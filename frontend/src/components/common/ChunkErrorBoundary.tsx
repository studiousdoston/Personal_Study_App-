import { Component, type ReactNode } from "react";
import { ErrorBox } from "./ErrorBox";
import { PageFallback } from "./PageFallback";

const RELOAD_KEY = "chunk-reload-at";
const RELOAD_WINDOW_MS = 10_000;

const CHUNK_ERROR_PATTERNS = [
  "Failed to fetch dynamically imported module",
  "Importing a module script failed",
  "error loading dynamically imported module",
];

function isChunkLoadError(error: unknown) {
  if (!(error instanceof Error)) return false;
  return (
    error.name === "ChunkLoadError" ||
    CHUNK_ERROR_PATTERNS.some((pattern) => error.message.includes(pattern))
  );
}

function reloadedRecently() {
  try {
    const at = Number(sessionStorage.getItem(RELOAD_KEY));
    return Date.now() - at < RELOAD_WINDOW_MS;
  } catch {
    return true;
  }
}
// storage blocked → we can't guard against a loop, so don't auto-reload

function markReload() {
  try {
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
    return true;
  } catch {
    return false;
  }
}

type Props = { resetKey: string; children: ReactNode };
type State = { error: unknown; reloading: boolean };

export class ChunkErrorBoundary extends Component<Props, State> {
  state: State = { error: null, reloading: false };

  static getDerivedStateFromError(error: unknown): State {
    return { error, reloading: isChunkLoadError(error) && !reloadedRecently() };
  }

  componentDidCatch() {
    if (!this.state.reloading) return;
    if (markReload()) {
      window.location.reload();
    } else {
      this.setState({ reloading: false });
    }
  }

  componentDidUpdate(prev: Props) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null, reloading: false });
    }
  }

  render() {
    const { error, reloading } = this.state;
    if (!error) return this.props.children;
    if (!isChunkLoadError(error)) throw error;
    if (reloading) return <PageFallback />;
    return (
      <ErrorBox
        message="This page couldn't load. Check your connection and reload."
        retryLabel="Reload"
        onRetry={() => window.location.reload()}
      />
    );
  }
}
// other errors are rethrown, so React Router's error screen still handles them
