import { Link, useLocation, useNavigate } from "react-router";
import { useState } from "react";

import { PasswordInput } from "../components/common/PasswordInput";
import { useAuth } from "../context/useAuth";
import { getErrorMessage } from "../services/errors";
import { readAuthLinkState, type AuthLinkState } from "../utils/authLinkState";
import styles from "./AuthPage.module.css";

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const linkState = readAuthLinkState(useLocation().state);
  const [email, setEmail] = useState(linkState.email ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await register(email, password);
      navigate("/", { replace: true });
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
          <h1 className={styles.title}>Create an account</h1>
          <p className={styles.subtitle}>Start building your decks.</p>
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
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>

          {error && (
            <p role="alert" className={styles.error}>
              {error}
            </p>
          )}

          <button type="submit" className={styles.button} disabled={submitting}>
            {submitting ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className={styles.footer}>
          Already have an account?{" "}
          <Link
            to="/login"
            state={{ from: linkState.from, email } satisfies AuthLinkState}
            className={styles.link}
          >
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}
