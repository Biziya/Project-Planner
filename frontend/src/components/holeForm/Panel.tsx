import type { ReactNode } from 'react';
import { useSheetsLook } from '../sheets';

interface PanelProps {
  title: string;
  tone: 'blue' | 'horizon' | 'sand' | 'camel' | 'uranium';
  readOnly: boolean;
  /** Extra classes on the panel (grid placement, background). */
  className?: string;
  /** Classes on the body (its grid or flex layout). */
  bodyClassName: string;
  children: ReactNode;
}

/** Form panel with a coloured title bar. On the Edit page the body is white with a thin grey border. */
export function Panel({ title, tone, readOnly, className = '', bodyClassName, children }: PanelProps) {
  const sheets = useSheetsLook();
  return (
    <section className={`sa-section sa-section--${tone} ${sheets ? 'border-gray-200 bg-white shadow-none' : ''} ${className}`}>
      <div className="sa-section__head">
        <h3 className="sa-section__title">{title}</h3>
        <span className={`sa-section__meta ${sheets ? 'whitespace-nowrap' : ''}`}>{readOnly ? 'Read only' : 'Edit mode'}</span>
      </div>
      <div className={`sa-section__body ${bodyClassName}`}>{children}</div>
    </section>
  );
}
