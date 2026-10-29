import { EditorContent, useEditor, type Editor, type JSONContent } from "@tiptap/react";
import Image from "@tiptap/extension-image";
import { Fragment, Slice, type Node as ProseMirrorNode } from "@tiptap/pm/model";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";
import { isHttpUrl } from "../../utils/isHttpUrl";
import { isUploadUrl } from "../../utils/isUploadUrl";
import content from "../common/CardContent.module.css";
import { docToMarkdown, markdownToDoc } from "./cardMarkdown";
import styles from "./RichTextEditor.module.css";

type RichTextEditorProps = {
  value: string;
  onChange: (markdown: string) => void;
  ariaLabel: string;
  autoFocus?: boolean;
  disabled?: boolean;
  onImageFile?: (file: File) => void;
  ref?: Ref<Editor | null>;
};

type Loaded = { source: string; doc: JSONContent; baseline: string };

const CardImage = Image.extend({
  addInputRules() {
    return [];
  },
  parseHTML() {
    return [
      {
        tag: "img[src]",
        getAttrs: (element) => (isUploadUrl(element.getAttribute("src") ?? "") ? null : false),
      },
    ];
  },
});

const extensions = [
  StarterKit.configure({
    blockquote: false,
    horizontalRule: false,
    strike: false,
    heading: { levels: [1, 2, 3] },
    link: {
      openOnClick: false,
      defaultProtocol: "https",
      isAllowedUri: (url) => isHttpUrl(url),
      HTMLAttributes: { target: "_blank", rel: "noopener noreferrer nofollow" },
    },
  }),
  CardImage.configure({ HTMLAttributes: { class: content.image } }),
];

function load(source: string): Loaded {
  const doc = markdownToDoc(source);
  return { source, doc, baseline: docToMarkdown(doc) };
}

function imageFile(files: FileList | undefined | null): File | undefined {
  return Array.from(files ?? []).find((file) => file.type.startsWith("image/"));
}

function withoutImages(fragment: Fragment): Fragment {
  const nodes: ProseMirrorNode[] = [];
  fragment.forEach((node) => {
    if (node.type.name === "image") return;
    nodes.push(node.isLeaf ? node : node.copy(withoutImages(node.content)));
  });
  return Fragment.from(nodes);
}

export function RichTextEditor({
  value,
  onChange,
  ariaLabel,
  autoFocus = false,
  disabled = false,
  onImageFile,
  ref,
}: RichTextEditorProps) {
  const [initial] = useState(() => load(value));
  const loaded = useRef(initial);
  const emitted = useRef(value);
  const onChangeRef = useRef(onChange);
  const onImageFileRef = useRef(onImageFile);

  useEffect(() => {
    onChangeRef.current = onChange;
    onImageFileRef.current = onImageFile;
  });

  const editor = useEditor({
    extensions,
    content: initial.doc,
    autofocus: autoFocus ? "end" : false,
    editable: !disabled,
    editorProps: {
      attributes: {
        class: `${content.content} ${content.full} ${styles.prose}`,
        role: "textbox",
        "aria-multiline": "true",
        "aria-label": ariaLabel,
      },
      scrollMargin: { top: 72, bottom: 16, left: 0, right: 0 },
      handleKeyDown: (view, event) => {
        if (event.key !== "Enter" || !(event.metaKey || event.ctrlKey)) return false;
        event.preventDefault();
        view.dom.closest("form")?.requestSubmit();
        return true;
      },
      handlePaste: (_view, event) => {
        const file = imageFile(event.clipboardData?.files);
        if (!file) return false;
        onImageFileRef.current?.(file);
        return true;
      },
      handleDrop: (_view, event) => {
        const file = imageFile(event.dataTransfer?.files);
        if (!file) return false;
        event.preventDefault();
        onImageFileRef.current?.(file);
        return true;
      },
      transformPasted: (slice, view) =>
        view.dragging
          ? slice
          : new Slice(withoutImages(slice.content), slice.openStart, slice.openEnd),
    },
    onUpdate: ({ editor }) => {
      const markdown = docToMarkdown(editor.getJSON());
      const next = markdown === loaded.current.baseline ? loaded.current.source : markdown;
      emitted.current = next;
      onChangeRef.current(next);
    },
  });

  useImperativeHandle(ref, () => editor, [editor]);

  useEffect(() => {
    if (value === emitted.current) return;
    const next = load(value);
    loaded.current = next;
    emitted.current = value;
    editor.commands.setContent(next.doc, { emitUpdate: false });
  }, [editor, value]);

  useEffect(() => {
    editor.setEditable(!disabled, false);
  }, [editor, disabled]);

  return <EditorContent editor={editor} className={styles.field} />;
}
