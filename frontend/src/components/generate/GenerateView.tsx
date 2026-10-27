import { useId, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Sparkles } from "lucide-react";
import { AI_MAX_INPUT_CHARS, AI_MAX_INSTRUCTIONS } from "../../constants";
import { useCreateGeneration } from "../../hooks/useCreateGeneration";
import { useDecks } from "../../hooks/useDecks";
import { getErrorMessage, hasStatus } from "../../services/errors";
import type { GenerationMode } from "../../types/models";
import { scrollFieldIntoView } from "../../utils/scrollFieldIntoView";
import { ErrorBox } from "../common/ErrorBox";
import { Spinner } from "../common/Spinner";
import { CountStepper } from "./CountStepper";
import { DeckSelect } from "./DeckSelect";
import { ModeToggle } from "./ModeToggle";
import { SourceList, type SourceBlock } from "./SourceList";
import styles from "./GenerateView.module.css";

const DEFAULT_COUNT = 10;
const numberFormat = new Intl.NumberFormat();

type FormErrors = { deck?: string; sources?: string; total?: string };

export function GenerateView({ initialDeckId }: { initialDeckId: string | null }) {
  const decks = useDecks();
  const mutation = useCreateGeneration();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const nextSourceId = useRef(1);
  const focusId = useId();

  const [deckId, setDeckId] = useState(initialDeckId ?? "");
  const [deckGone, setDeckGone] = useState(false);
  const [sources, setSources] = useState<SourceBlock[]>([{ id: 0, text: "" }]);
  const [mode, setMode] = useState<GenerationMode>("qa");
  const [count, setCount] = useState(DEFAULT_COUNT);
  const [focus, setFocus] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const activeDecks = decks.data ?? [];
  const selectedDeckId = activeDecks.some((deck) => deck.id === deckId) ? deckId : "";
  const filledSources = sources.map((s) => s.text.trim()).filter((text) => text !== "");
  const totalChars =
    filledSources.reduce((sum, text) => sum + text.length, 0) + focus.trim().length;
  const overLimit = totalChars > AI_MAX_INPUT_CHARS;
  const errors = submitted ? validate() : {};

  function validate(): FormErrors {
    const result: FormErrors = {};
    if (selectedDeckId === "") result.deck = "Choose a deck";
    if (filledSources.length === 0) result.sources = "Paste some notes to make cards from";
    if (overLimit) {
      result.total = `Too long: shorten your notes to ${numberFormat.format(AI_MAX_INPUT_CHARS)} characters`;
    }
    return result;
  }

  function changeDeck(next: string) {
    setDeckId(next);
    setDeckGone(false);
  }

  function changeSource(id: number, text: string) {
    setSources((prev) => prev.map((s) => (s.id === id ? { ...s, text } : s)));
  }

  function addSource() {
    setSources((prev) => [...prev, { id: nextSourceId.current++, text: "" }]);
  }

  function removeSource(id: number) {
    setSources((prev) => prev.filter((s) => s.id !== id));
  }

  async function submit() {
    if (mutation.isPending) return;
    setSubmitted(true);
    if (Object.keys(validate()).length > 0) return;
    try {
      const generation = await mutation.mutateAsync({
        deckId: selectedDeckId,
        data: {
          sources: filledSources.map((text) => ({ type: "text", text })),
          mode,
          count,
          instructions: focus.trim() || null,
        },
      });
      navigate(`/generations/${generation.id}`, { replace: true });
    } catch (err) {
      if (hasStatus(err, 404)) {
        setDeckId("");
        setDeckGone(true);
        mutation.reset();
        queryClient.invalidateQueries({ queryKey: ["decks"] });
      }
    }
  }

  function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    submit();
  }

  if (decks.isPending) {
    return <div className={styles.skeleton} aria-hidden="true" />;
  }
  if (decks.isError) {
    return <ErrorBox message={getErrorMessage(decks.error)} onRetry={() => decks.refetch()} />;
  }

  return (
    <div className={styles.page}>
      <Link to="/" className={styles.back}>
        <ArrowLeft size={18} aria-hidden="true" />
        All decks
      </Link>

      <header className={styles.header}>
        <h1 className={styles.title}>Generate cards</h1>
        <p className={styles.subtitle}>
          Paste your notes and AI will draft cards for you to review.
        </p>
      </header>

      {activeDecks.length === 0 ? (
        <div className={styles.empty}>
          <p>You need a deck to put the cards in.</p>
          <Link to="/" className={styles.emptyLink}>
            Create a deck first
          </Link>
        </div>
      ) : (
        <form
          className={styles.form}
          onSubmit={handleSubmit}
          onFocus={scrollFieldIntoView}
          noValidate
        >
          <DeckSelect
            decks={activeDecks}
            value={selectedDeckId}
            onChange={changeDeck}
            error={deckGone ? "This deck no longer exists" : errors.deck}
          />

          <SourceList
            sources={sources}
            onChange={changeSource}
            onAdd={addSource}
            onRemove={removeSource}
            error={errors.sources}
          />

          <ModeToggle value={mode} onChange={setMode} />
          <CountStepper value={count} onChange={setCount} />

          <div className={styles.field}>
            <label htmlFor={focusId} className={styles.label}>
              Focus <span className={styles.optional}>(optional)</span>
            </label>
            <input
              id={focusId}
              className={styles.input}
              value={focus}
              onChange={(e) => setFocus(e.target.value)}
              maxLength={AI_MAX_INSTRUCTIONS}
              placeholder="e.g. focus on chapter 2"
              autoComplete="off"
            />
          </div>

          <div className={styles.footer}>
            <p className={`${styles.counter} ${overLimit ? styles.over : ""}`}>
              {numberFormat.format(totalChars)} / {numberFormat.format(AI_MAX_INPUT_CHARS)}
              <span className={styles.srOnly}> characters</span>
            </p>
            {errors.total && <p className={styles.error}>{errors.total}</p>}
          </div>

          {mutation.isError && (
            <ErrorBox message={getErrorMessage(mutation.error)} onRetry={submit} />
          )}

          <button type="submit" className={styles.submit} aria-busy={mutation.isPending}>
            {mutation.isPending ? <Spinner /> : <Sparkles size={18} aria-hidden="true" />}
            {mutation.isPending ? "Starting…" : "Generate cards"}
          </button>
        </form>
      )}
    </div>
  );
}
