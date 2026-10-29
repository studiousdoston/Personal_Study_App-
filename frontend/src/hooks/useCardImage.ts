import { useMutation } from "@tanstack/react-query";
import type { Editor } from "@tiptap/react";
import { useRef, useState } from "react";
import { UPLOAD_MAX_MB } from "../constants";
import { hasStatus } from "../services/errors";
import { uploadImage } from "../services/upload.service";
import type { Upload } from "../types/models";

type FoundImage = { editor: Editor; pos: number };

function findImage(editors: (Editor | null)[]): FoundImage | null {
  for (const editor of editors) {
    let pos = -1;
    editor?.state.doc.descendants((node, nodePos) => {
      if (pos !== -1) return false;
      if (node.type.name === "image") pos = nodePos;
    });
    if (editor && pos !== -1) return { editor, pos };
  }
  return null;
}

export function useCardImage(editors: (Editor | null)[]) {
  const [tooLarge, setTooLarge] = useState(false);
  const target = useRef<Editor | null>(null);
  const mutation = useMutation({
    mutationFn: uploadImage,
    onSuccess: (upload) => place(upload),
  });

  function place(upload: Upload) {
    const existing = findImage(editors);
    if (existing) {
      existing.editor.commands.command(({ tr }) => {
        tr.setNodeMarkup(existing.pos, undefined, { src: upload.url, alt: "" });
        return true;
      });
      return;
    }
    target.current?.chain().focus().setImage({ src: upload.url, alt: "" }).run();
  }

  function attach(file: File, into: Editor | null) {
    if (mutation.isPending) return;
    mutation.reset();
    setTooLarge(file.size > UPLOAD_MAX_MB * 1024 * 1024);
    if (file.size > UPLOAD_MAX_MB * 1024 * 1024) return;
    target.current = into;
    mutation.mutate(file);
  }

  function remove() {
    const existing = findImage(editors);
    existing?.editor.commands.command(({ tr }) => {
      tr.delete(existing.pos, existing.pos + 1);
      return true;
    });
  }

  function retry() {
    if (mutation.variables) mutation.mutate(mutation.variables);
  }

  function dismiss() {
    setTooLarge(false);
    mutation.reset();
  }

  const knownError =
    tooLarge || hasStatus(mutation.error, 413)
      ? `Image is too large (max ${UPLOAD_MAX_MB} MB)`
      : hasStatus(mutation.error, 415)
        ? "That file isn't a supported image"
        : null;

  return {
    hasImage: findImage(editors) !== null,
    pending: mutation.isPending,
    knownError,
    error: knownError ? null : mutation.error,
    attach,
    remove,
    retry,
    dismiss,
  };
}
