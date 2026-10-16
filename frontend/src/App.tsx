import { useState, type FormEvent } from "react";
import { api } from "./services/client";
import styles from "./App.module.css";
import { useAuth } from "./context/useAuth";
import axios from "axios";

function getErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err) && typeof err.response?.data?.detail === "string") {
    return err.response.data.detail;
  }
  return "Something went wrong";
}

export default function App() {
  const { status, user, login, register, logout } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  async function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");
    try {
      await login(email, password);
    } catch (err) {
      setMessage(getErrorMessage(err));
    }
  }

  async function handleRegister() {
    setMessage("");
    try {
      await register(email, password);
    } catch (err) {
      setMessage(getErrorMessage(err));
    }
  }

  async function loadStats() {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const res = await api.get("/stats", { params: { tz } });
      setMessage(JSON.stringify(res.data));
    } catch (err) {
      setMessage(getErrorMessage(err));
    }
  }

  if (status === "loading") {
    return <main className={styles.page}>Loading...</main>;
  }

  if (status === "unauthenticated") {
    return (
      <main className={styles.page}>
        <h1 className={styles.title}>Study App</h1>
        <form onSubmit={handleLogin}>
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
          />
          <button type="submit">Log in</button>
          <button type="button" onClick={handleRegister}>
            Register
          </button>
        </form>
        <p className={styles.subtitle}>{message}</p>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <h1 className={styles.title}>Logged in as {user?.email}</h1>
      <button onClick={loadStats}>Load stats</button>
      <button onClick={logout}>Log out</button>
      <p className={styles.subtitle}>{message}</p>
    </main>
  );
}
