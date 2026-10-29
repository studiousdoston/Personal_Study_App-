import * as Popover from "@radix-ui/react-popover";
import type { Editor } from "@tiptap/react";
import { Link2 } from "lucide-react";
import { useId, useState } from "react";
import { isHttpUrl } from "../../utils/isHttpUrl";
import { ToolbarButton } from "./ToolbarButton";
import styles from "./LinkPopover.module.css";

type LinkPopoverProps = {
  editor: Editor | null;
  href: string | null;
  disabled: boolean;
};

function normalize(input: string): string {
  const url = input.trim();
  return /^[a-z][a-z0-9+.-]*:/i.test(url) ? url : `https://${url}`;
}

export function LinkPopover({ editor, href, disabled }: LinkPopoverProps) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [invalid, setInvalid] = useState(false);
  const inputId = useId();

  function handleOpenChange(next: boolean) {
    if (next) {
      setUrl(href ?? "");
      setInvalid(false);
    }
    setOpen(next);
  }

  function apply(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    e.stopPropagation();
    if (!editor || url.trim() === "") return;
    const next = normalize(url);
    if (!isHttpUrl(next)) {
      setInvalid(true);
      return;
    }
    const chain = editor.chain().focus();
    if (editor.state.selection.empty && !editor.isActive("link")) {
      chain.insertContent({
        type: "text",
        text: next,
        marks: [{ type: "link", attrs: { href: next } }],
      });
    } else {
      chain.extendMarkRange("link").setLink({ href: next });
    }
    chain.run();
    setOpen(false);
  }

  function remove() {
    editor?.chain().focus().extendMarkRange("link").unsetLink().run();
    setOpen(false);
  }

  return (
    <Popover.Root open={open} onOpenChange={handleOpenChange}>
      <Popover.Trigger asChild>
        <ToolbarButton label="Link" pressed={href !== null} disabled={disabled}>
          <Link2 size={18} aria-hidden="true" />
        </ToolbarButton>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className={styles.popover}
          align="start"
          sideOffset={4}
          collisionPadding={16}
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            editor?.commands.focus();
          }}
        >
          <form className={styles.form} onSubmit={apply} noValidate>
            <label htmlFor={inputId} className={styles.label}>
              Link address
            </label>
            <input
              id={inputId}
              className={styles.input}
              type="url"
              inputMode="url"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              placeholder="https://"
              value={url}
              aria-invalid={invalid}
              onChange={(e) => {
                setUrl(e.target.value);
                setInvalid(false);
              }}
            />
            {invalid && (
              <p role="alert" className={styles.error}>
                Only http and https links are allowed
              </p>
            )}
            <div className={styles.actions}>
              {href !== null && (
                <button type="button" className={styles.secondary} onClick={remove}>
                  Remove link
                </button>
              )}
              <button type="submit" className={styles.primary} disabled={url.trim() === ""}>
                Apply
              </button>
            </div>
          </form>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
