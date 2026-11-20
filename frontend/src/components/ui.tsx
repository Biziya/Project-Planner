import { useEffect, useRef, useState, type ReactNode } from 'react';
import { api, type HoleStatus, type LookupItem } from '../api/api';
import { Icon } from './Icon';
import { Select } from './Select';

export { Icon } from './Icon';

// ---------------------------------------------------------------- status chip
const statusClass: Record<HoleStatus, string> = {
  Preparation: '', PROJECT: 'sa-status--info', PROGRAM_TOVALIDATE: 'sa-status--warning', PROGRAM_VALIDATED: 'sa-status--success', FAILED: 'sa-status--danger'
};
export const StatusChip = ({ status, short }: { status: HoleStatus; short?: boolean }) => (
  <span className={`sa-status ${statusClass[status]}`}>
    {short ? status.replace('PROGRAM_TOVALIDATE', 'TO VALIDATE').replace('PROGRAM_VALIDATED', 'VALIDATED') : status}
  </span>
);

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

export function LookupSelect({ id, parent, value, onChange, label, invalid, disabled, look }: {
  id: string; parent?: string | null; value: string | null | undefined; onChange: (v: string | null) => void; label: string; invalid?: boolean; disabled?: boolean;
  look?: 'field' | 'cell';
}) {
  const items = useLookup(id, parent);
  const options = [
    { value: '', label: 'Select…' },
    ...(value && !items.some((i) => i.code === value) ? [{ value, label: value }] : []),
    ...items.map((i) => ({ value: i.code, label: i.description && i.description !== i.code ? `${i.code} – ${i.description}` : i.code })),
  ];
  return <Select label={label} value={value ?? ''} options={options} invalid={invalid} disabled={disabled} look={look} onChange={(v) => onChange(v || null)} />;
}

