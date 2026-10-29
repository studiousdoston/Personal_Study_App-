import { useEditorState, type Editor } from "@tiptap/react";
import {
  Bold,
  Code,
  ImageOff,
  ImagePlus,
  ImageUp,
  Italic,
  List,
  ListOrdered,
  Underline,
} from "lucide-react";
import { useRef } from "react";
import { Spinner } from "../common/Spinner";
import { HeadingMenu } from "./HeadingMenu";
import { LinkPopover } from "./LinkPopover";
import { ToolbarButton } from "./ToolbarButton";
import styles from "./EditorToolbar.module.css";

type EditorToolbarProps = {
  editor: Editor | null;
  hasImage: boolean;
  imagePending: boolean;
  disabled?: boolean;
  onImageFile: (file: File) => void;
  onRemoveImage: () => void;
};

export function EditorToolbar({
  editor,
  hasImage,
  imagePending,
  disabled = false,
  onImageFile,
  onRemoveImage,
}: EditorToolbarProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const state = useEditorState({
    editor,
    selector: ({ editor }) =>
      editor && {
        bold: editor.isActive("bold"),
        italic: editor.isActive("italic"),
        underline: editor.isActive("underline"),
        bulletList: editor.isActive("bulletList"),
        orderedList: editor.isActive("orderedList"),
        codeBlock: editor.isActive("codeBlock"),
        level: ([1, 2, 3] as const).find((level) => editor.isActive("heading", { level })) ?? 0,
        href: editor.isActive("link") ? String(editor.getAttributes("link").href ?? "") : null,
        canMark: editor.can().toggleBold(),
      },
  });

  const off = disabled || !editor || !state;
  const markOff = off || !state.canMark;
  const run = (command: (editor: Editor) => void) => () => {
    if (editor) command(editor);
  };

  return (
    <div className={styles.toolbar} role="toolbar" aria-label="Formatting">
      <HeadingMenu editor={editor} level={state?.level ?? 0} disabled={off} />
      <span className={styles.divider} aria-hidden="true" />
      <ToolbarButton
        label="Bold"
        pressed={state?.bold}
        disabled={markOff}
        onClick={run((e) => e.chain().focus().toggleBold().run())}
      >
        <Bold size={18} aria-hidden="true" />
      </ToolbarButton>
      <ToolbarButton
        label="Italic"
        pressed={state?.italic}
        disabled={markOff}
        onClick={run((e) => e.chain().focus().toggleItalic().run())}
      >
        <Italic size={18} aria-hidden="true" />
      </ToolbarButton>
      <ToolbarButton
        label="Underline"
        pressed={state?.underline}
        disabled={markOff}
        onClick={run((e) => e.chain().focus().toggleUnderline().run())}
      >
        <Underline size={18} aria-hidden="true" />
      </ToolbarButton>
      <span className={styles.divider} aria-hidden="true" />
      <ToolbarButton
        label="Bullet list"
        pressed={state?.bulletList}
        disabled={off}
        onClick={run((e) => e.chain().focus().toggleBulletList().run())}
      >
        <List size={18} aria-hidden="true" />
      </ToolbarButton>
      <ToolbarButton
        label="Numbered list"
        pressed={state?.orderedList}
        disabled={off}
        onClick={run((e) => e.chain().focus().toggleOrderedList().run())}
      >
        <ListOrdered size={18} aria-hidden="true" />
      </ToolbarButton>
      <ToolbarButton
        label="Code block"
        pressed={state?.codeBlock}
        disabled={off}
        onClick={run((e) => e.chain().focus().toggleCodeBlock().run())}
      >
        <Code size={18} aria-hidden="true" />
      </ToolbarButton>
      <LinkPopover editor={editor} href={state?.href ?? null} disabled={markOff} />
      <span className={styles.divider} aria-hidden="true" />
      <ToolbarButton
        label={hasImage ? "Replace image" : "Image"}
        disabled={off || imagePending}
        aria-busy={imagePending}
        onClick={() => fileRef.current?.click()}
      >
        {imagePending ? (
          <Spinner size={16} />
        ) : hasImage ? (
          <ImageUp size={18} aria-hidden="true" />
        ) : (
          <ImagePlus size={18} aria-hidden="true" />
        )}
      </ToolbarButton>
      {hasImage && (
        <ToolbarButton
          label="Remove image"
          disabled={disabled || imagePending}
          onClick={onRemoveImage}
        >
          <ImageOff size={18} aria-hidden="true" />
        </ToolbarButton>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) onImageFile(file);
        }}
      />
    </div>
  );
}
