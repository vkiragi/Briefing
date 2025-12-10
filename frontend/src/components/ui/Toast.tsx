import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

type ToastVariant = 'default' | 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  title?: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextType {
  toasts: Toast[];
  toast: (toast: Omit<Toast, 'id'>) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};

const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((newToast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    const toastWithId = { ...newToast, id };
    
    setToasts((prev) => [...prev, toastWithId]);

    // Auto dismiss after duration (default 5 seconds)
    const duration = newToast.duration ?? 5000;
    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </ToastContext.Provider>
  );
};

const ToastContainer: React.FC<{ toasts: Toast[]; dismiss: (id: string) => void }> = ({
  toasts,
  dismiss,
}) => {
  return (
    <div className="fixed top-0 right-0 z-[100] flex flex-col gap-2 w-full sm:w-auto max-w-[420px] p-4 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} dismiss={dismiss} />
        ))}
      </AnimatePresence>
    </div>
  );
};

const ToastItem: React.FC<{ toast: Toast; dismiss: (id: string) => void }> = ({
  toast,
  dismiss,
}) => {
  const variant = toast.variant || 'default';

  const variants = {
    default: 'bg-card border-border text-white',
    success: 'bg-card border-accent/30 text-white',
    error: 'bg-card border-red-500/30 text-white',
    warning: 'bg-card border-yellow-500/30 text-white',
    info: 'bg-card border-blue-500/30 text-white',
  };

  const icons = {
    default: null,
    success: <CheckCircle2 className="h-5 w-5 text-accent" />,
    error: <AlertCircle className="h-5 w-5 text-red-500" />,
    warning: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
    info: <Info className="h-5 w-5 text-blue-500" />,
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
      className={cn(
        'pointer-events-auto relative flex w-full items-center gap-3 rounded-lg border p-4 shadow-lg',
        variants[variant]
      )}
    >
      {icons[variant] && <div className="flex-shrink-0">{icons[variant]}</div>}
      
      <div className="flex-1 space-y-1 min-w-0">
        {toast.title && (
          <div className="text-sm font-semibold">{toast.title}</div>
        )}
        {toast.description && (
          <div className="text-sm text-gray-400 whitespace-pre-line break-words">{toast.description}</div>
        )}
      </div>

      {toast.action && (
        <button
          onClick={() => {
            toast.action?.onClick();
            dismiss(toast.id);
          }}
          className="text-sm font-medium text-accent hover:text-accent/80 transition-colors"
        >
          {toast.action.label}
        </button>
      )}

      <button
        onClick={() => dismiss(toast.id)}
        className="flex-shrink-0 text-gray-400 hover:text-white transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </motion.div>
  );
};

export { ToastProvider, useToast };

