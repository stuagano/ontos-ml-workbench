/**
 * KeyboardShortcuts - Help modal showing available shortcuts
 */

import { useState, useEffect } from "react";
import { X, Keyboard } from "lucide-react";
import { formatShortcut, type ModifierKey } from "../hooks/useKeyboardShortcuts";

interface ShortcutItem {
  keys: { key: string; modifiers?: ModifierKey[] }[];
  description: string;
}

interface ShortcutGroup {
  title: string;
  shortcuts: ShortcutItem[];
}

const shortcutGroups: ShortcutGroup[] = [
  {
    title: "General",
    shortcuts: [
      { keys: [{ key: "k", modifiers: ["ctrl"] }, { key: "/" }], description: "Search" },
      { keys: [{ key: "n", modifiers: ["ctrl"] }], description: "Create new item" },
      { keys: [{ key: "s", modifiers: ["ctrl"] }], description: "Save" },
      { keys: [{ key: "?", modifiers: ["shift"] }], description: "Show keyboard shortcuts" },
    ],
  },
  {
    title: "Navigation",
    shortcuts: [
      { keys: [{ key: "ArrowUp" }, { key: "k" }], description: "Previous item" },
      { keys: [{ key: "ArrowDown" }, { key: "j" }], description: "Next item" },
      { keys: [{ key: "Enter" }], description: "Select / Open" },
      { keys: [{ key: "Escape" }], description: "Close / Cancel" },
    ],
  },
  {
    title: "Curation",
    shortcuts: [
      { keys: [{ key: "a" }], description: "Approve item" },
      { keys: [{ key: "r" }], description: "Reject item" },
      { keys: [{ key: "f" }], description: "Flag for review" },
      { keys: [{ key: "Space" }], description: "Toggle selection" },
    ],
  },
];

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsModal({
  isOpen,
  onClose,
}: KeyboardShortcutsModalProps) {
  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-db-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-db-gray-100 rounded-lg">
              <Keyboard className="w-5 h-5 text-db-gray-600" />
            </div>
            <h2 className="text-lg font-semibold text-db-gray-800">
              Keyboard Shortcuts
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-db-gray-400 hover:text-db-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-80px)]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {shortcutGroups.map((group) => (
              <div key={group.title}>
                <h3 className="text-sm font-semibold text-db-gray-500 uppercase tracking-wide mb-3">
                  {group.title}
                </h3>
                <div className="space-y-2">
                  {group.shortcuts.map((shortcut, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-db-gray-50"
                    >
                      <span className="text-sm text-db-gray-700">
                        {shortcut.description}
                      </span>
                      <div className="flex items-center gap-1">
                        {shortcut.keys.map((k, i) => (
                          <span key={i} className="flex items-center gap-1">
                            {i > 0 && (
                              <span className="text-xs text-db-gray-400 mx-1">
                                or
                              </span>
                            )}
                            <kbd className="px-2 py-1 text-xs font-mono bg-db-gray-100 border border-db-gray-200 rounded shadow-sm">
                              {formatShortcut(k.key, k.modifiers)}
                            </kbd>
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-db-gray-50 border-t border-db-gray-200 text-center">
          <span className="text-xs text-db-gray-500">
            Press <kbd className="px-1.5 py-0.5 text-xs font-mono bg-white border border-db-gray-200 rounded">?</kbd> anytime to show this help
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook to manage keyboard shortcuts help modal
 */
export function useKeyboardShortcutsHelp() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Show help on Shift+?
      if (e.key === "?" && e.shiftKey) {
        e.preventDefault();
        setIsOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
  };
}

/**
 * Small keyboard hint badge
 */
export function ShortcutHint({
  shortcut,
  modifiers,
  className,
}: {
  shortcut: string;
  modifiers?: ModifierKey[];
  className?: string;
}) {
  return (
    <kbd
      className={`px-1.5 py-0.5 text-xs font-mono bg-db-gray-100 border border-db-gray-200 rounded text-db-gray-500 ${className || ""}`}
    >
      {formatShortcut(shortcut, modifiers)}
    </kbd>
  );
}
