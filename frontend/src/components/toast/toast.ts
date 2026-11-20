import { ApiError } from '../../api/api';

/**
 * Toast store: call `toast.success('IZO_446 saved')` from anywhere; <Toaster /> (rendered once in App) shows them.
 * At most 3 at once (the oldest goes first), and the same message is never shown twice at the same time.
 */
export type ToastType = 'success' | 'error' | 'warning' | 'info';
export interface ToastAction { label: string; onClick: () => void }
export interface ToastItem { id: number; type: ToastType; message: string; action?: ToastAction; /** Bumped when a duplicate restarts the timer. */ version: number }

const MAX_TOASTS = 3;
let toasts: ToastItem[] = [];
let nextId = 1;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());

function show(type: ToastType, message: string, opts?: { action?: ToastAction }): number {
  const same = toasts.find((t) => t.type === type && t.message === message);
  if (same) {
    toasts = toasts.map((t) => (t === same ? { ...t, action: opts?.action ?? t.action, version: t.version + 1 } : t));
  } else {
    toasts = [...toasts, { id: nextId++, type, message, action: opts?.action, version: 0 }].slice(-MAX_TOASTS);
  }
  emit();
  return same?.id ?? nextId - 1;
}

export const toast = {
  success: (message: string, opts?: { action?: ToastAction }) => show('success', message, opts),
  error: (message: string, opts?: { action?: ToastAction }) => show('error', message, opts),
  warning: (message: string, opts?: { action?: ToastAction }) => show('warning', message, opts),
  info: (message: string, opts?: { action?: ToastAction }) => show('info', message, opts),
  dismiss: (id: number) => { toasts = toasts.filter((t) => t.id !== id); emit(); },
  /** Removes every toast (tests). */
  clear: () => { toasts = []; emit(); },
};

export const toastStore = {
  subscribe: (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; },
  getSnapshot: () => toasts,
};

/** Auto-dismiss delay; errors stay until closed. */
export const TOAST_DURATION: Record<ToastType, number | null> = { success: 4000, info: 4000, warning: 6000, error: null };

/** Short message for a failed API call: "Could not save: network error". */
export function errorText(what: string, e: unknown): string {
  return `${what}: ${e instanceof ApiError ? e.message : 'network error'}`;
}
