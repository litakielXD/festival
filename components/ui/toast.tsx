"use client";

import React, { useEffect, useState } from "react";
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from "lucide-react";

export type ToastType = "success" | "error" | "info" | "warning";

export type ToastEvent = {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
};

type Listener = (toast: ToastEvent) => void;
const listeners = new Set<Listener>();

export const toast = {
  show(message: string, type: ToastType = "info", duration = 4000) {
    const id = Math.random().toString(36).substring(2, 9);
    const event: ToastEvent = { id, message, type, duration };
    listeners.forEach((l) => l(event));
    return id;
  },
  success(message: string, duration?: number) {
    return this.show(message, "success", duration);
  },
  error(message: string, duration?: number) {
    return this.show(message, "error", duration);
  },
  info(message: string, duration?: number) {
    return this.show(message, "info", duration);
  },
  warning(message: string, duration?: number) {
    return this.show(message, "warning", duration);
  },
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }
};

type ActiveToast = ToastEvent & {
  isExiting?: boolean;
};

export function ToastContainer() {
  const [toasts, setToasts] = useState<ActiveToast[]>([]);

  useEffect(() => {
    const unsubscribe = toast.subscribe((newToast) => {
      setToasts((prev) => [...prev, newToast]);
      
      const duration = newToast.duration ?? 4000;
      setTimeout(() => {
        triggerExit(newToast.id);
      }, duration);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  const triggerExit = (id: string) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isExiting: true } : t))
    );
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 180);
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[999] flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onClose={() => triggerExit(t.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onClose }: { toast: ActiveToast; onClose: () => void }) {
  const { message, type, isExiting } = toast;

  const typeStyles = {
    success: {
      bg: "bg-emerald-50/90 dark:bg-emerald-950/80 border-emerald-200 dark:border-emerald-900/60",
      text: "text-emerald-800 dark:text-emerald-200",
      icon: <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
    },
    error: {
      bg: "bg-rose-50/90 dark:bg-rose-950/80 border-rose-200 dark:border-rose-900/60",
      text: "text-rose-800 dark:text-rose-200",
      icon: <AlertCircle className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0" />
    },
    info: {
      bg: "bg-sky-50/90 dark:bg-sky-950/80 border-sky-200 dark:border-sky-900/60",
      text: "text-sky-800 dark:text-sky-200",
      icon: <Info className="h-5 w-5 text-sky-600 dark:text-sky-400 shrink-0" />
    },
    warning: {
      bg: "bg-amber-50/90 dark:bg-amber-950/80 border-amber-200 dark:border-amber-900/60",
      text: "text-amber-800 dark:text-amber-200",
      icon: <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
    }
  };

  const style = typeStyles[type];

  return (
    <div
      className={`pointer-events-auto flex items-start justify-between gap-3 rounded-xl border backdrop-blur-md p-3.5 shadow-lg transition-all ${
        style.bg
      } ${style.text} ${isExiting ? "animate-toast-out" : "animate-toast-in"}`}
      role="alert"
    >
      <div className="flex items-start gap-2.5">
        {style.icon}
        <p className="text-xs font-semibold leading-relaxed whitespace-pre-line">{message}</p>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded transition shrink-0"
        aria-label="Schließen"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
