import { useEffect, useRef, useSyncExternalStore } from 'react';
import { Icon, type IconName } from '../Icon';
import { TOAST_DURATION, toast, toastStore, type ToastItem, type ToastType } from './toast';

const ICON: Record<ToastType, { name: IconName; color: string }> = {
  success: { name: 'checkCircle', color: 'text-green-400' },
  error: { name: 'alertCircle', color: 'text-red-400' },
  warning: { name: 'alertTriangle', color: 'text-amber-400' },
  info: { name: 'info', color: 'text-blue-300' },
};

/** All toasts, bottom-left; render once near the root of the app. */
export function Toaster() {
  const toasts = useSyncExternalStore(toastStore.subscribe, toastStore.getSnapshot);
  return (
    <div className="pointer-events-none fixed bottom-6 left-6 z-[60] flex flex-col gap-2">
      {toasts.map((t) => <Toast key={t.id} item={t} />)}
    </div>
  );
}

/** One snackbar. Auto-dismiss pauses while the mouse is over it or focus is inside it. */
function Toast({ item }: { item: ToastItem }) {
  const duration = TOAST_DURATION[item.type];
  const remaining = useRef(duration ?? 0);
  const startedAt = useRef(0);
  const timer = useRef<number>();
  const holds = useRef(new Set<'hover' | 'focus'>());   // the timer runs only while nothing holds it

  const stop = () => window.clearTimeout(timer.current);
  const start = () => {
    if (duration === null || holds.current.size > 0) return;
    stop();
    startedAt.current = Date.now();
    timer.current = window.setTimeout(() => toast.dismiss(item.id), remaining.current);
  };
  const pause = (why: 'hover' | 'focus') => {
    const wasRunning = holds.current.size === 0;
    holds.current.add(why);
    if (duration === null || !wasRunning) return;
    stop();
    remaining.current -= Date.now() - startedAt.current;
  };
  const resume = (why: 'hover' | 'focus') => { holds.current.delete(why); start(); };

  // (Re)start the full timer when shown, and when the same message is shown again.
  useEffect(() => {
    remaining.current = duration ?? 0;
    start();
    return stop;
  }, [item.version]); // eslint-disable-line react-hooks/exhaustive-deps

  const isError = item.type === 'error';
  const icon = ICON[item.type];
  return (
    <div role={isError ? 'alert' : 'status'} aria-live={isError ? 'assertive' : 'polite'} data-type={item.type}
      onMouseEnter={() => pause('hover')} onMouseLeave={() => resume('hover')}
      onFocus={() => pause('focus')}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) resume('focus'); }}
      className="pointer-events-auto flex min-h-12 w-max max-w-sm items-center gap-3 rounded-md bg-snackbar py-2 pl-4 pr-2 font-sans text-sm text-white shadow-lg">
      <span className={`flex flex-none [&_svg]:h-5 [&_svg]:w-5 ${icon.color}`}><Icon name={icon.name} /></span>
      <span className="min-w-0 flex-1 py-1">{item.message}</span>
      {item.action && (
        <button type="button" onClick={() => { item.action?.onClick(); toast.dismiss(item.id); }}
          className="flex-none cursor-pointer rounded border-0 bg-transparent px-2 py-1 font-sans text-sm font-semibold text-snackbar-action hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-snackbar-action">
          {item.action.label}
        </button>
      )}
      <button type="button" aria-label="Dismiss" title="Dismiss" onClick={() => toast.dismiss(item.id)}
        className="inline-flex h-8 w-8 flex-none cursor-pointer items-center justify-center rounded-full border-0 bg-transparent p-0 text-gray-300 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-snackbar-action [&_svg]:h-4 [&_svg]:w-4">
        <Icon name="close" />
      </button>
    </div>
  );
}
