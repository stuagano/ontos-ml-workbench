/**
 * Toast notification system
 */

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { clsx } from 'clsx';

// ============================================================================
// Types
// ============================================================================

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

// ============================================================================
// Context
// ============================================================================

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

// ============================================================================
// Provider
// ============================================================================

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast = { ...toast, id };

    setToasts(prev => [...prev, newToast]);

    // Auto-remove after duration
    const duration = toast.duration ?? (toast.type === 'error' ? 5000 : 3000);
    setTimeout(() => {
      removeToast(id);
    }, duration);
  }, [removeToast]);

  const success = useCallback((title: string, message?: string) => {
    addToast({ type: 'success', title, message });
  }, [addToast]);

  const error = useCallback((title: string, message?: string) => {
    addToast({ type: 'error', title, message, duration: 5000 });
  }, [addToast]);

  const warning = useCallback((title: string, message?: string) => {
    addToast({ type: 'warning', title, message });
  }, [addToast]);

  const info = useCallback((title: string, message?: string) => {
    addToast({ type: 'info', title, message });
  }, [addToast]);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, success, error, warning, info }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

// ============================================================================
// Toast Container
// ============================================================================

interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
}

// ============================================================================
// Toast Item
// ============================================================================

interface ToastItemProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

const TOAST_CONFIG: Record<ToastType, { icon: typeof CheckCircle; bgColor: string; iconColor: string; borderColor: string }> = {
  success: { icon: CheckCircle, bgColor: 'bg-green-50', iconColor: 'text-green-500', borderColor: 'border-green-200' },
  error: { icon: XCircle, bgColor: 'bg-red-50', iconColor: 'text-red-500', borderColor: 'border-red-200' },
  warning: { icon: AlertTriangle, bgColor: 'bg-amber-50', iconColor: 'text-amber-500', borderColor: 'border-amber-200' },
  info: { icon: Info, bgColor: 'bg-blue-50', iconColor: 'text-blue-500', borderColor: 'border-blue-200' },
};

function ToastItem({ toast, onRemove }: ToastItemProps) {
  const config = TOAST_CONFIG[toast.type];
  const Icon = config.icon;

  return (
    <div
      className={clsx(
        'flex items-start gap-3 p-4 rounded-lg border shadow-lg animate-slide-in',
        config.bgColor,
        config.borderColor
      )}
      role="alert"
    >
      <Icon className={clsx('w-5 h-5 flex-shrink-0', config.iconColor)} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-db-gray-900">{toast.title}</p>
        {toast.message && (
          <p className="text-sm text-db-gray-600 mt-0.5">{toast.message}</p>
        )}
      </div>
      <button
        onClick={() => onRemove(toast.id)}
        className="flex-shrink-0 p-1 text-db-gray-400 hover:text-db-gray-600 rounded"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
