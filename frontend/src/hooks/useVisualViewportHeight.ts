import { useEffect } from "react";
import { isTypingTarget } from "../utils/keyboard";

const DIALOG_SELECTOR = '[role="dialog"], [role="alertdialog"]';

export function useVisualViewportHeight() {
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const root = document.documentElement;

    const update = () => {
      root.style.setProperty("--vvh", `${viewport.height}px`);
      root.style.setProperty("--vv-top", `${viewport.offsetTop}px`);

      const active = document.activeElement;
      if (
        active instanceof HTMLElement &&
        isTypingTarget(active) &&
        active.closest(DIALOG_SELECTOR)
      ) {
        active.scrollIntoView({ block: "nearest" });
      }
    };

    update();
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
      root.style.removeProperty("--vvh");
      root.style.removeProperty("--vv-top");
    };
  }, []);
}
