/**
 * useKeyboardShortcuts - Global keyboard shortcut handling
 */

import { useEffect, useCallback } from "react";

export type ModifierKey = "ctrl" | "alt" | "shift" | "meta";
type KeyHandler = (event: KeyboardEvent) => void;

interface Shortcut {
  key: string;
  modifiers?: ModifierKey[];
  handler: KeyHandler;
  description?: string;
  global?: boolean; // Works even when focused on inputs
}

interface UseKeyboardShortcutsOptions {
  enabled?: boolean;
}

/**
 * Hook to register keyboard shortcuts
 */
export function useKeyboardShortcuts(
  shortcuts: Shortcut[],
  options: UseKeyboardShortcutsOptions = {},
) {
  const { enabled = true } = options;

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Skip if typing in an input (unless shortcut is marked global)
      const target = event.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      for (const shortcut of shortcuts) {
        if (isInput && !shortcut.global) continue;

        const keyMatches =
          event.key.toLowerCase() === shortcut.key.toLowerCase();
        if (!keyMatches) continue;

        const modifiers = shortcut.modifiers || [];
        const ctrlRequired = modifiers.includes("ctrl");
        const altRequired = modifiers.includes("alt");
        const shiftRequired = modifiers.includes("shift");
        const metaRequired = modifiers.includes("meta");

        const ctrlPressed = event.ctrlKey || event.metaKey; // Treat Cmd as Ctrl on Mac
        const altPressed = event.altKey;
        const shiftPressed = event.shiftKey;
        const metaPressed = event.metaKey;

        const modifiersMatch =
          ctrlPressed === ctrlRequired &&
          altPressed === altRequired &&
          shiftPressed === shiftRequired &&
          (metaRequired ? metaPressed : true);

        if (modifiersMatch) {
          event.preventDefault();
          shortcut.handler(event);
          return;
        }
      }
    },
    [shortcuts, enabled],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}

/**
 * Common app-wide shortcuts
 */
export function useAppShortcuts({
  onSearch,
  onNew,
  onSave,
  onHelp,
}: {
  onSearch?: () => void;
  onNew?: () => void;
  onSave?: () => void;
  onHelp?: () => void;
}) {
  const shortcuts: Shortcut[] = [];

  if (onSearch) {
    shortcuts.push({
      key: "k",
      modifiers: ["ctrl"],
      handler: onSearch,
      description: "Search",
      global: true,
    });
    shortcuts.push({
      key: "/",
      handler: onSearch,
      description: "Search",
    });
  }

  if (onNew) {
    shortcuts.push({
      key: "n",
      modifiers: ["ctrl"],
      handler: onNew,
      description: "New item",
    });
  }

  if (onSave) {
    shortcuts.push({
      key: "s",
      modifiers: ["ctrl"],
      handler: onSave,
      description: "Save",
      global: true,
    });
  }

  if (onHelp) {
    shortcuts.push({
      key: "?",
      modifiers: ["shift"],
      handler: onHelp,
      description: "Show help",
    });
  }

  useKeyboardShortcuts(shortcuts);
}

/**
 * Navigation shortcuts for lists/tables
 */
export function useListNavigation({
  onUp,
  onDown,
  onSelect,
  onEscape,
  enabled = true,
}: {
  onUp?: () => void;
  onDown?: () => void;
  onSelect?: () => void;
  onEscape?: () => void;
  enabled?: boolean;
}) {
  const shortcuts: Shortcut[] = [];

  if (onUp) {
    shortcuts.push({
      key: "ArrowUp",
      handler: onUp,
      description: "Previous item",
    });
    shortcuts.push({
      key: "k",
      handler: onUp,
      description: "Previous item (vim)",
    });
  }

  if (onDown) {
    shortcuts.push({
      key: "ArrowDown",
      handler: onDown,
      description: "Next item",
    });
    shortcuts.push({
      key: "j",
      handler: onDown,
      description: "Next item (vim)",
    });
  }

  if (onSelect) {
    shortcuts.push({
      key: "Enter",
      handler: onSelect,
      description: "Select item",
    });
  }

  if (onEscape) {
    shortcuts.push({
      key: "Escape",
      handler: onEscape,
      description: "Close/Cancel",
      global: true,
    });
  }

  useKeyboardShortcuts(shortcuts, { enabled });
}

/**
 * Format shortcut for display
 */
export function formatShortcut(key: string, modifiers?: ModifierKey[]): string {
  const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
  const parts: string[] = [];

  if (modifiers?.includes("ctrl")) {
    parts.push(isMac ? "⌘" : "Ctrl");
  }
  if (modifiers?.includes("alt")) {
    parts.push(isMac ? "⌥" : "Alt");
  }
  if (modifiers?.includes("shift")) {
    parts.push("⇧");
  }

  // Format special keys
  const keyDisplay =
    key === "ArrowUp"
      ? "↑"
      : key === "ArrowDown"
        ? "↓"
        : key === "ArrowLeft"
          ? "←"
          : key === "ArrowRight"
            ? "→"
            : key === "Enter"
              ? "↵"
              : key === "Escape"
                ? "Esc"
                : key.toUpperCase();

  parts.push(keyDisplay);
  return parts.join(isMac ? "" : "+");
}
