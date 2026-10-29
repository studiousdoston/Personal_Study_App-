import type { ComponentProps } from "react";
import styles from "./ToolbarButton.module.css";

type ToolbarButtonProps = ComponentProps<"button"> & {
  label: string;
  pressed?: boolean;
};

export function ToolbarButton({
  label,
  pressed,
  className,
  onMouseDown,
  ...props
}: ToolbarButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      className={`${styles.button} ${className ?? ""}`}
      onMouseDown={(e) => {
        e.preventDefault();
        onMouseDown?.(e);
      }}
      {...props}
    />
  );
}
