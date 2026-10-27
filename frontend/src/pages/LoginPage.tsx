import { Link, useLocation, useNavigate } from "react-router";
import { useState } from "react";

import { PasswordInput } from "../components/common/PasswordInput";
import { useAuth } from "../context/useAuth";
import { getErrorMessage } from "../services/errors";
import { readAuthLinkState, type AuthLinkState } from "../utils/authLinkState";
import styles from "./AuthPage.module.css";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const linkState = readAuthLinkState(location.state);
  const from = linkState.from ?? "/";
  // The page RequireAuth remembered, or "/" if the user came to /login directly
  const [email, setEmail] = useState(linkState.email ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <header className={styles.header}>
          <h1 className={styles.title}>Welcome back</h1>
          <p className={styles.subtitle}>Log in to continue studying.</p>
        </header>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label htmlFor="email" className={styles.label}>
              Email
            </label>
            <input
              id="email"
              type="email"
              className={styles.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="password" className={styles.label}>
              Password
            </label>
            <PasswordInput
              id="password"
              className={styles.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          {error && (
            <p role="alert" className={styles.error}>
              {error}
            </p>
          )}

          <button type="submit" className={styles.button} disabled={submitting}>
            {submitting ? "Logging in..." : "Log in"}
          </button>
        </form>

        <p className={styles.footer}>
          No account?{" "}
          <Link
            to="/register"
            state={{ from: linkState.from, email } satisfies AuthLinkState}
            className={styles.link}
          >
            Register
          </Link>
        </p>
      </div>
    </main>
  );
}
