import { useEffect } from "react";

// Minimal global hotkey hook: Cmd/Ctrl+K toggles the command palette,
// Escape closes whatever's open. Kept as a hook so it's not tangled into
// a single giant root component.
export function useHotkeys({ onTogglealette, onEscape }) {
  useEffect(() => {
    function onKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onTogglealette?.();
      }
      if (e.key === "Escape") {
        onEscape?.();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onTogglealette, onEscape]);
}
