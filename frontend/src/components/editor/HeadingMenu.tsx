import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import type { Editor } from "@tiptap/react";
import { Check, ChevronDown, Heading } from "lucide-react";
import { ToolbarButton } from "./ToolbarButton";
import styles from "./HeadingMenu.module.css";

type Level = 0 | 1 | 2 | 3;

const OPTIONS: { level: Level; label: string }[] = [
  { level: 0, label: "Normal text" },
  { level: 1, label: "Heading 1" },
  { level: 2, label: "Heading 2" },
  { level: 3, label: "Heading 3" },
];

type HeadingMenuProps = {
  editor: Editor | null;
  level: number;
  disabled: boolean;
};

export function HeadingMenu({ editor, level, disabled }: HeadingMenuProps) {
  function choose(next: Level) {
    const chain = editor?.chain().focus();
    if (next === 0) chain?.setParagraph().run();
    else chain?.setHeading({ level: next }).run();
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <ToolbarButton label="Text style" pressed={level > 0} disabled={disabled}>
          <Heading size={18} aria-hidden="true" />
          <ChevronDown size={14} aria-hidden="true" />
        </ToolbarButton>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className={styles.menu}
          align="start"
          sideOffset={4}
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            editor?.commands.focus();
          }}
        >
          <DropdownMenu.RadioGroup
            value={String(level)}
            onValueChange={(value) => choose(Number(value) as Level)}
          >
            {OPTIONS.map((option) => (
              <DropdownMenu.RadioItem
                key={option.level}
                value={String(option.level)}
                className={`${styles.item} ${option.level > 0 ? styles[`h${option.level}`] : ""}`}
              >
                {option.label}
                <DropdownMenu.ItemIndicator className={styles.indicator}>
                  <Check size={16} aria-hidden="true" />
                </DropdownMenu.ItemIndicator>
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
