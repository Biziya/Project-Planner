import { useEffect, useRef, useState, type ReactNode } from 'react';
import { api, type HoleStatus, type LookupItem } from '../api/api';

// ---------------------------------------------------------------- icons (16 px, stroke)
const paths: Record<string, string> = {
  list: 'M2.5 4h11M2.5 8h11M2.5 12h11',
  download: 'M8 2.5v8M4.5 7L8 10.5 11.5 7M3 13.5h10',
  plus: 'M8 3v10M3 8h10',
  close: 'M4 4l8 8M12 4l-8 8',
  check: 'M3 8.5l3 3 7-7',
  search: 'M7 2.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9zM10.5 10.5L14 14',
  chevron: 'M4 6l4 4 4-4',
  send: 'M2.5 8h9M8 4.5L11.5 8 8 11.5M13.5 3v10',
  trash: 'M3 4.5h10M6.5 4.5V3h3v1.5M5 4.5l.5 8.5h5l.5-8.5',
  lock: 'M3.5 7h9v6.5h-9zM5.5 7V5.5a2.5 2.5 0 0 1 5 0V7',
};
export const Icon = ({ name }: { name: keyof typeof paths }) => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={paths[name]} />
  </svg>
);

// ---------------------------------------------------------------- status chip
const statusClass: Record<HoleStatus, string> = {
  Preparation: '', PROJECT: 'sa-status--info', PROGRAM_TOVALIDATE: 'sa-status--warning', PROGRAM_VALIDATED: 'sa-status--success', FAILED: 'sa-status--danger'
};
export const StatusChip = ({ status, short }: { status: HoleStatus; short?: boolean }) => (
  <span className={`sa-status ${statusClass[status]}`}>
    {short ? status.replace('PROGRAM_TOVALIDATE', 'TO VALIDATE').replace('PROGRAM_VALIDATED', 'VALIDATED') : status}
  </span>
);

// ---------------------------------------------------------------- banners
export type Notice = { kind: 'success' | 'danger' | 'warning'; text: string } | null;
export const Banner = ({ notice, onClose }: { notice: Notice; onClose: () => void }) =>
  notice ? (
    <div role={notice.kind === 'danger' ? 'alert' : 'status'} className={`sa-note sa-note--${notice.kind}`} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <span style={{ flex: 1 }}>{notice.text}</span>
      <button className="sa-btn sa-btn--tertiary sa-btn--sm" onClick={onClose}>Dismiss</button>
    </div>
  ) : null;

// ---------------------------------------------------------------- modal
export function Modal({ title, onClose, children, footer, width }: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode; width?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    ref.current?.querySelector<HTMLElement>('input, select, button:not([aria-label="Close"])')?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="sa-backdrop tw-backdrop">
      <div ref={ref} className="sa-modal" role="dialog" aria-modal="true" aria-label={title} style={{ width: width ?? 720 }}>
        <div className="sa-modal__head">
          <h2 className="sa-modal__title">{title}</h2>
          <button className="sa-btn sa-btn--icon sa-btn--sm" aria-label="Close" onClick={onClose}><Icon name="close" /></button>
        </div>
        <div className="sa-modal__body">{children}</div>
        {footer && <div className="sa-modal__foot">{footer}</div>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- lookups (cached per id + parent)
const cache = new Map<string, Promise<LookupItem[]>>();
export function useLookup(id: string | undefined, parent?: string | null) {
  const [items, setItems] = useState<LookupItem[]>([]);
  useEffect(() => {
    if (!id) return;
    const key = `${id}|${parent ?? ''}`;
    if (!cache.has(key)) cache.set(key, api.lookup(id, parent).catch(() => []));
    let alive = true;
    cache.get(key)!.then((v) => alive && setItems(v));
    return () => { alive = false; };
  }, [id, parent]);
  return items;
}

export function LookupSelect({ id, parent, value, onChange, label, invalid, disabled }: {
  id: string; parent?: string | null; value: string | null | undefined; onChange: (v: string | null) => void; label: string; invalid?: boolean; disabled?: boolean;
}) {
  const items = useLookup(id, parent);
  const known = !value || items.some((i) => i.code === value);
  return (
    <span className={`sa-input${invalid ? ' is-invalid' : ''}${disabled ? ' is-readonly' : ''}`}>
      <select aria-label={label} value={value ?? ''} disabled={disabled} onChange={(e) => onChange(e.target.value || null)}>
        <option value="">Select…</option>
        {!known && <option value={value!}>{value}</option>}
        {items.map((i) => <option key={i.code} value={i.code}>{i.description && i.description !== i.code ? `${i.code} – ${i.description}` : i.code}</option>)}
      </select>
    </span>
  );
}

/** Unsaved-changes guard (spec 4.6). */
export const confirmDiscard = (dirty: boolean) => !dirty || window.confirm('Discard your changes?');
