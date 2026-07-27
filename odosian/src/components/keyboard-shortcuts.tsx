"use client";

import { Modal } from "@/components/ui/modal";

const SHORTCUTS = [
  { keys: ["Ctrl", "K"], description: "Open command palette" },
  { keys: ["?"], description: "Show keyboard shortcuts" },
  { keys: ["Esc"], description: "Close modals and popups" },
];

interface KeyboardShortcutsProps {
  open: boolean;
  onClose: () => void;
}

export function KeyboardShortcuts({ open, onClose }: KeyboardShortcutsProps) {
  return (
    <Modal open={open} onClose={onClose} title="Keyboard Shortcuts" size="sm">
      <div className="space-y-3">
        {SHORTCUTS.map((shortcut) => (
          <div key={shortcut.description} className="flex items-center justify-between">
            <span className="text-sm text-text-secondary">{shortcut.description}</span>
            <div className="flex items-center gap-1">
              {shortcut.keys.map((key, i) => (
                <span key={i}>
                  {i > 0 && <span className="text-text-muted text-xs mx-0.5">+</span>}
                  <kbd className="inline-flex items-center px-2 py-1 rounded bg-surface-light border border-border text-xs text-text font-mono min-w-[28px] justify-center">
                    {key}
                  </kbd>
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-text-muted mt-4 pt-3 border-t border-border">
        On macOS, use Cmd instead of Ctrl.
      </p>
    </Modal>
  );
}
