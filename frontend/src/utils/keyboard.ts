export function isTypingTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)
  );
}

export function isActivatable(target: EventTarget | null) {
  return target instanceof HTMLElement && target.closest("button, a") !== null;
}
