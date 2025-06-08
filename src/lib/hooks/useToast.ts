import { useState, useCallback } from 'react';

export type ToastVariant = 'default' | 'destructive' | 'success' | 'warning' | 'info';

export interface Toast {
  id: string;
  title?: string;
  description: string;
  variant?: ToastVariant;
  action?: {
    label: string;
    onClick: () => void;
  };
  duration?: number;
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback(
    (toast: Omit<Toast, 'id'>) => {
      const id = Math.random().toString(36).slice(2);
      const newToast: Toast = {
        ...toast,
        id,
        variant: toast.variant || 'default',
        duration: toast.duration || 5000,
      };

      setToasts((prev) => [...prev, newToast]);

      if (newToast.duration !== Infinity) {
        setTimeout(() => {
          removeToast(id);
        }, newToast.duration);
      }

      return id;
    },
    []
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const updateToast = useCallback((id: string, toast: Partial<Toast>) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...toast } : t))
    );
  }, []);

  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  // Convenience methods for different toast types
  const success = useCallback(
    (description: string, options?: Partial<Toast>) => {
      return addToast({ description, variant: 'success', ...options });
    },
    [addToast]
  );

  const error = useCallback(
    (description: string, options?: Partial<Toast>) => {
      return addToast({ description, variant: 'destructive', ...options });
    },
    [addToast]
  );

  const warning = useCallback(
    (description: string, options?: Partial<Toast>) => {
      return addToast({ description, variant: 'warning', ...options });
    },
    [addToast]
  );

  const info = useCallback(
    (description: string, options?: Partial<Toast>) => {
      return addToast({ description, variant: 'info', ...options });
    },
    [addToast]
  );

  return {
    toasts,
    addToast,
    removeToast,
    updateToast,
    clearToasts,
    success,
    error,
    warning,
    info,
  };
} 