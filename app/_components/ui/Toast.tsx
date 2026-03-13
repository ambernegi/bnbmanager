"use client";

import { useCallback, useMemo, useState } from "react";

export type ToastTone = "neutral" | "good" | "bad";

export type ToastItem = {
  id: string;
  message: string;
  tone: ToastTone;
};

function newId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `t_${Math.random().toString(16).slice(2)}`;
}

export function useToasts(opts?: { ttlMs?: number }) {
  const ttlMs = opts?.ttlMs ?? 2400;
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const push = useCallback(
    (message: string, tone: ToastTone = "neutral") => {
      const id = newId();
      setToasts((t) => [...t, { id, message, tone }]);
      window.setTimeout(() => dismiss(id), ttlMs);
    },
    [dismiss, ttlMs],
  );

  return useMemo(() => ({ toasts, push, dismiss }), [toasts, push, dismiss]);
}

export function Toaster({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  // Basic accessibility: announce changes.
  return (
    <div
      aria-live="polite"
      aria-relevant="additions removals"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 p-4"
    >
      <div className="mx-auto flex max-w-6xl justify-end">
        <div className="flex w-full max-w-sm flex-col gap-2">
          {toasts.map((t) => {
            const toneCls =
              t.tone === "good"
                ? "border-emerald-200/80 bg-emerald-50/80 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/50 dark:text-emerald-100"
                : t.tone === "bad"
                  ? "border-red-200/80 bg-red-50/80 text-red-900 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-100"
                  : "border-zinc-200/80 bg-white/80 text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950/70 dark:text-zinc-50";
            return (
              <div
                key={t.id}
                className={[
                  "pointer-events-auto flex items-start justify-between gap-3 rounded-2xl border px-3 py-2 shadow-sm",
                  "backdrop-blur supports-[backdrop-filter]:bg-white/70 dark:supports-[backdrop-filter]:bg-zinc-950/60",
                  "transition-all duration-200 ease-out",
                  toneCls,
                ].join(" ")}
              >
                <div className="text-sm">{t.message}</div>
                <button
                  type="button"
                  onClick={() => onDismiss(t.id)}
                  className="rounded-lg px-2 py-1 text-xs font-medium text-zinc-600 hover:bg-white dark:text-zinc-300 dark:hover:bg-zinc-900"
                >
                  Close
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

