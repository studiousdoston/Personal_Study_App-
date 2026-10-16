import { useEffect, useState } from "react";
import { api } from "./services/client";
import styles from "./App.module.css";

export default function App() {
  const [status, setStatus] = useState("Checking API...");

  useEffect(() => {
    api
      .get("/health")
      .then((res) => setStatus(`API: ${res.data.status}, database: ${res.data.database}`))
      .catch(() => setStatus("Could not reach the API"));
  }, []);

  return (
    <main className={styles.page}>
      <h1 className={styles.title}>Study App</h1>
      <p className={styles.subtitle}>{status}</p>
    </main>
  );
}
