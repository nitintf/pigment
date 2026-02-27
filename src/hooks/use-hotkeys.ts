import { useEffect } from "react";

interface HotkeyBinding {
  /** Key to match (e.g. "k", "\\", "j", "1") */
  key: string;
  /** Require Cmd (Mac) / Ctrl (Win) */
  meta?: boolean;
  /** Require Shift */
  shift?: boolean;
  /** Handler to run */
  handler: () => void;
}

/**
 * Registers global keyboard shortcuts. Ignores events when the user
 * is typing in an input, textarea, or contenteditable element.
 */
export function useHotkeys(bindings: HotkeyBinding[]) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Don't intercept shortcuts in editable elements
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable
      ) {
        // Allow Cmd+K even in inputs (to open command menu)
        const isMeta = e.metaKey || e.ctrlKey;
        if (!(isMeta && e.key.toLowerCase() === "k")) {
          return;
        }
      }

      for (const binding of bindings) {
        const metaMatch = binding.meta ? e.metaKey || e.ctrlKey : true;
        const shiftMatch = binding.shift ? e.shiftKey : !e.shiftKey;
        const keyMatch = e.key.toLowerCase() === binding.key.toLowerCase();

        if (metaMatch && shiftMatch && keyMatch) {
          e.preventDefault();
          binding.handler();
          return;
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [bindings]);
}
