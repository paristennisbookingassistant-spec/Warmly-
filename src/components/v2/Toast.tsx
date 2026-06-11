"use client";

/**
 * components/v2/Toast.tsx
 * Lightweight toast system for the V2 app — a context provider + useToast() hook.
 * Ported from design/warmly-v2/project/js/shared.jsx (ToastProvider / useToast).
 * One toast at a time, auto-dismissing; bottom-right, espresso pill with a
 * pulsing sienna dot.
 */

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";

interface ToastState {
  id: number;
  msg: string;
}

type ShowToast = (msg: string, opts?: { duration?: number }) => void;

const ToastContext = createContext<ShowToast | null>(null);

export function useToast(): ShowToast {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a <ToastProvider>");
  }
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const show = useCallback<ShowToast>((msg, opts = {}) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const id = Date.now();
    setToast({ id, msg });
    timerRef.current = setTimeout(() => setToast(null), opts.duration ?? 3200);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast && (
        <div key={toast.id} className="fixed bottom-6 right-6 z-50 animate-slide-up">
          <div
            className="flex items-center gap-3 rounded-xl py-3 pl-4 pr-5 shadow-medium"
            style={{
              background: "var(--ink)",
              color: "var(--bg)",
              minWidth: 280,
              maxWidth: 420,
            }}
          >
            <span
              className="inline-block w-[7px] h-[7px] rounded-full pulse-dot"
              style={{ background: "var(--accent)" }}
            />
            <div className="text-[13px] leading-snug">{toast.msg}</div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}
