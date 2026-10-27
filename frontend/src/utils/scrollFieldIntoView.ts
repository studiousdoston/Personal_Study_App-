import { isTypingTarget } from "./keyboard";

export function scrollFieldIntoView(e: React.FocusEvent<HTMLElement>) {
  if (isTypingTarget(e.target)) {
    e.target.scrollIntoView({ block: "nearest" });
  }
}
