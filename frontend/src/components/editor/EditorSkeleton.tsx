import styles from "./EditorSkeleton.module.css";

export function EditorSkeleton({ variant }: { variant: "field" | "toolbar" }) {
  return <div className={styles[variant]} aria-hidden="true" />;
}
