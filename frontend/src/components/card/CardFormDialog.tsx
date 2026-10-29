import * as Dialog from "@radix-ui/react-dialog";
import type { Editor } from "@tiptap/react";
import { lazy, Suspense, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { CARD_TEXT_MAX_LENGTH } from "../../constants";
import { useCardImage } from "../../hooks/useCardImage";
import { useCreateCard } from "../../hooks/useCreateCard";
import { useUpdateCard } from "../../hooks/useUpdateCard";
import { getErrorMessage } from "../../services/errors";
import type { Card, CardDraft, CardUpdate, DraftUpdate } from "../../types/models";
import { scrollFieldIntoView } from "../../utils/scrollFieldIntoView";
import { ErrorBox } from "../common/ErrorBox";
import dialog from "../common/Dialog.module.css";
import { EditorSkeleton } from "../editor/EditorSkeleton";
import styles from "./CardFormDialog.module.css";

const RichTextEditor = lazy(() =>
  import("../editor/RichTextEditor").then((m) => ({ default: m.RichTextEditor })),
);
const EditorToolbar = lazy(() =>
  import("../editor/EditorToolbar").then((m) => ({ default: m.EditorToolbar })),
);

type CardFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deckId: string;
  card?: Card;
  draftEdit?: DraftEdit;
};

type DraftEdit = {
  draft: CardDraft;
  onSubmit: (changes: DraftUpdate) => Promise<unknown>;
};

type Side = "front" | "back";

function tooLong(text: string): boolean {
  return [...text.trim()].length > CARD_TEXT_MAX_LENGTH;
}

export function CardFormDialog({
  open,
  onOpenChange,
  deckId,
  card,
  draftEdit,
}: CardFormDialogProps) {
  const isEdit = card !== undefined;
  const isDraft = draftEdit !== undefined;
  const initial = draftEdit?.draft ?? card;
  const [front, setFront] = useState(initial?.front ?? "");
  const [back, setBack] = useState(initial?.back ?? "");
  const createMutation = useCreateCard(deckId);
  const updateMutation = useUpdateCard();
  const draftMutation = useMutation({
    mutationFn: async (changes: DraftUpdate) => draftEdit?.onSubmit(changes),
  });
  const mutation = isDraft ? draftMutation : isEdit ? updateMutation : createMutation;
  const [frontEditor, setFrontEditor] = useState<Editor | null>(null);
  const [backEditor, setBackEditor] = useState<Editor | null>(null);
  const [active, setActive] = useState<Side>("front");
  const image = useCardImage([frontEditor, backEditor]);
  const activeEditor = active === "front" ? frontEditor : backEditor;

  function close() {
    setFront(initial?.front ?? "");
    setBack(initial?.back ?? "");
    setActive("front");
    mutation.reset();
    image.dismiss();
    onOpenChange(false);
  }

  function handleOpenChange(next: boolean) {
    if (next) {
      onOpenChange(true);
      return;
    }
    if (mutation.isPending || image.pending) return;
    close();
  }

  async function save(addAnother: boolean) {
    if (!canSubmit) return;
    if (addAnother && !frontEditor?.isFocused) {
      frontEditor?.commands.focus();
    }
    const data = { front: front.trim(), back: back.trim() };
    try {
      if (isDraft) {
        const changes: DraftUpdate = {};
        if (data.front !== draftEdit.draft.front) changes.front = data.front;
        if (data.back !== draftEdit.draft.back) changes.back = data.back;
        if (Object.keys(changes).length > 0) {
          await draftMutation.mutateAsync(changes);
        }
      } else if (isEdit) {
        const changes: CardUpdate = {};
        if (data.front !== card.front) changes.front = data.front;
        if (data.back !== card.back) changes.back = data.back;
        if (Object.keys(changes).length > 0) {
          await updateMutation.mutateAsync({ cardId: card.id, data: changes });
        }
      } else {
        await createMutation.mutateAsync(data);
      }
    } catch {
      return;
    }
    if (addAnother) {
      setFront("");
      setBack("");
      setActive("front");
      frontEditor?.commands.focus();
      return;
    }
    close();
  }

  function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    void save(false);
  }

  function keepFocus(e: React.PointerEvent | React.MouseEvent) {
    e.preventDefault();
  }

  const frontTooLong = tooLong(front);
  const backTooLong = tooLong(back);
  const canSubmit =
    front.trim() !== "" &&
    back.trim() !== "" &&
    !frontTooLong &&
    !backTooLong &&
    !mutation.isPending &&
    !image.pending;

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={dialog.overlay} />
        <Dialog.Content
          className={`${dialog.content} ${styles.content}`}
          onFocus={scrollFieldIntoView}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <header className={styles.header}>
            <Dialog.Title className={styles.title}>
              {isDraft ? "Edit draft" : isEdit ? "Edit card" : "Add card"}
            </Dialog.Title>
            <Dialog.Description className={styles.subtitle}>
              {isDraft
                ? "Edited drafts are kept when you regenerate."
                : isEdit
                  ? "Change the question or the answer."
                  : "Put the question on the front and the answer on the back."}
            </Dialog.Description>
          </header>

          <form className={styles.form} onSubmit={handleSubmit}>
            <Suspense fallback={<EditorSkeleton variant="toolbar" />}>
              <div className={styles.toolbar}>
                <EditorToolbar
                  editor={activeEditor}
                  hasImage={image.hasImage}
                  imagePending={image.pending}
                  disabled={mutation.isPending}
                  onImageFile={(file) => image.attach(file, activeEditor)}
                  onRemoveImage={image.remove}
                />
              </div>
            </Suspense>

            {image.knownError && (
              <p role="alert" className={styles.error}>
                {image.knownError}
              </p>
            )}
            {image.error && (
              <ErrorBox message={getErrorMessage(image.error)} onRetry={image.retry} />
            )}

            <div className={styles.field} onFocus={() => setActive("front")}>
              <span className={styles.label}>Front</span>
              <Suspense fallback={<EditorSkeleton variant="field" />}>
                <RichTextEditor
                  ref={setFrontEditor}
                  value={front}
                  onChange={setFront}
                  ariaLabel="Front"
                  autoFocus
                  disabled={mutation.isPending}
                  onImageFile={(file) => image.attach(file, frontEditor)}
                />
              </Suspense>
              {frontTooLong && (
                <p role="alert" className={styles.error}>
                  Front is too long. Shorten it to {CARD_TEXT_MAX_LENGTH} characters, including
                  formatting.
                </p>
              )}
            </div>

            <div className={styles.field} onFocus={() => setActive("back")}>
              <span className={styles.label}>Back</span>
              <Suspense fallback={<EditorSkeleton variant="field" />}>
                <RichTextEditor
                  ref={setBackEditor}
                  value={back}
                  onChange={setBack}
                  ariaLabel="Back"
                  disabled={mutation.isPending}
                  onImageFile={(file) => image.attach(file, backEditor)}
                />
              </Suspense>
              {backTooLong && (
                <p role="alert" className={styles.error}>
                  Back is too long. Shorten it to {CARD_TEXT_MAX_LENGTH} characters, including
                  formatting.
                </p>
              )}
            </div>

            {mutation.isError && (
              <p role="alert" className={styles.error}>
                {getErrorMessage(mutation.error)}
              </p>
            )}

            <div className={styles.actions}>
              <Dialog.Close asChild>
                <button type="button" className={styles.secondary} disabled={mutation.isPending}>
                  Cancel
                </button>
              </Dialog.Close>
              {!isEdit && !isDraft && (
                <button
                  type="button"
                  className={styles.secondary}
                  disabled={!canSubmit}
                  onPointerDown={keepFocus}
                  onMouseDown={keepFocus}
                  onClick={() => save(true)}
                >
                  Save and add another
                </button>
              )}
              <button type="submit" className={styles.primary} disabled={!canSubmit}>
                {mutation.isPending ? "Saving..." : isEdit || isDraft ? "Save changes" : "Save"}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
