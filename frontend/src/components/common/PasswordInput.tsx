import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Eye, EyeOff } from "lucide-react";
import styles from "./PasswordInput.module.css";

type PasswordInputProps = Omit<React.ComponentProps<"input">, "type" | "ref"> & {
  autoComplete: "current-password" | "new-password";
};

export function PasswordInput({ className, ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const form = inputRef.current?.form;
    if (!form) return;
    const hide = () => flushSync(() => setVisible(false));
    form.addEventListener("submit", hide);
    return () => form.removeEventListener("submit", hide);
  }, []);

  function keepFocus(e: React.PointerEvent | React.MouseEvent) {
    e.preventDefault();
  }

  const Icon = visible ? EyeOff : Eye;

  return (
    <div className={styles.wrapper}>
      <input
        {...props}
        ref={inputRef}
        type={visible ? "text" : "password"}
        className={`${className ?? ""} ${styles.input}`}
      />
      <button
        type="button"
        className={styles.toggle}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        aria-controls={props.id}
        onPointerDown={keepFocus}
        onMouseDown={keepFocus}
        onClick={() => setVisible((v) => !v)}
      >
        <Icon size={20} aria-hidden="true" />
      </button>
    </div>
  );
}
