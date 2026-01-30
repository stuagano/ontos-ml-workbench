/**
 * ConfirmDialog - Modal confirmation for destructive actions
 */

import { AlertTriangle, Loader2, X } from "lucide-react";
import { clsx } from "clsx";

export type ConfirmVariant = "danger" | "warning" | "info";

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
  isLoading?: boolean;
}

const variantStyles: Record<
  ConfirmVariant,
  { icon: string; button: string; iconBg: string }
> = {
  danger: {
    icon: "text-red-600",
    button: "bg-red-600 hover:bg-red-700",
    iconBg: "bg-red-50",
  },
  warning: {
    icon: "text-amber-600",
    button: "bg-amber-600 hover:bg-amber-700",
    iconBg: "bg-amber-50",
  },
  info: {
    icon: "text-blue-600",
    button: "bg-blue-600 hover:bg-blue-700",
    iconBg: "bg-blue-50",
  },
};

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  isLoading = false,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  const styles = variantStyles[variant];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={isLoading ? undefined : onClose}
      />

      {/* Dialog */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Close button */}
        <button
          onClick={onClose}
          disabled={isLoading}
          className="absolute top-4 right-4 text-db-gray-400 hover:text-db-gray-600 disabled:opacity-50"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Content */}
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={clsx("p-3 rounded-full", styles.iconBg)}>
              <AlertTriangle className={clsx("w-6 h-6", styles.icon)} />
            </div>
            <div className="flex-1 pt-1">
              <h3 className="text-lg font-semibold text-db-gray-900">{title}</h3>
              <p className="mt-2 text-sm text-db-gray-600">{message}</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-db-gray-50 border-t border-db-gray-200">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-db-gray-700 hover:bg-db-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={clsx(
              "flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50",
              styles.button
            )}
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook for managing confirm dialog state
 */
import { useState, useCallback } from "react";

interface UseConfirmDialogOptions {
  onConfirm: () => void | Promise<void>;
}

export function useConfirmDialog({ onConfirm }: UseConfirmDialogOptions) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => {
    if (!isLoading) setIsOpen(false);
  }, [isLoading]);

  const confirm = useCallback(async () => {
    setIsLoading(true);
    try {
      await onConfirm();
      setIsOpen(false);
    } finally {
      setIsLoading(false);
    }
  }, [onConfirm]);

  return {
    isOpen,
    isLoading,
    open,
    close,
    confirm,
  };
}
