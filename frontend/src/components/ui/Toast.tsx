'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

type ToastType = 'error' | 'info';

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
  visible: boolean;
}

const BORDER_COLORS: Record<ToastType, string> = {
  error: 'border-red-500/60 text-red-300',
  info: 'border-blue-500/60 text-blue-300',
};

let nextId = 0;

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'error') => {
    const id = nextId++;
    setToasts((prev) => [...prev, { id, message, type, visible: false }]);

    // Fade in after mount
    requestAnimationFrame(() => {
      if (mountedRef.current) {
        setToasts((prev) =>
          prev.map((t) => (t.id === id ? { ...t, visible: true } : t))
        );
      }
    });

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      if (mountedRef.current) {
        setToasts((prev) =>
          prev.map((t) => (t.id === id ? { ...t, visible: false } : t))
        );
        // Remove from DOM after fade out
        setTimeout(() => {
          if (mountedRef.current) {
            setToasts((prev) => prev.filter((t) => t.id !== id));
          }
        }, 300);
      }
    }, 5000);
  }, []);

  function ToastContainer() {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
      setMounted(true);
    }, []);

    if (!mounted || toasts.length === 0) return null;

    return createPortal(
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto rounded-lg border bg-slate-800 px-4 py-3 shadow-lg
              text-sm transition-opacity duration-300
              ${BORDER_COLORS[toast.type]}
              ${toast.visible ? 'opacity-100' : 'opacity-0'}`}
          >
            {toast.message}
          </div>
        ))}
      </div>,
      document.body
    );
  }

  return { showToast, ToastContainer };
}
