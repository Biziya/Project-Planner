import type { ReactNode } from 'react';
import { GENERAL_SECTIONS, type FieldDef } from '../../api/fields';
import { useSheetsLook } from '../sheets';
import { Panel } from './Panel';

export const FAILURE_COMMENT: FieldDef = { key: 'failureComment', label: 'Failure comment', kind: 'text' };

interface GeneralTabProps { readOnly: boolean; failed: boolean; renderField: (f: FieldDef) => ReactNode }

/**
 * Edit page: header and coordinates side by side (one column below lg), picket details full width below.
 * Field columns follow one rhythm: 2 per half-width panel, 4 across the full-width panel.
 */
export function GeneralTab({ readOnly, failed, renderField }: GeneralTabProps) {
  const sheets = useSheetsLook();
  const grid = sheets
    ? 'grid grid-cols-1 gap-6 lg:grid-cols-2'
    : 'grid grid-cols-[repeat(auto-fit,minmax(380px,1fr))] gap-4 [&_.sa-input.is-readonly]:border-locked';
  const fields = (wide?: boolean) => sheets
    ? `grid gap-4 sm:grid-cols-2 ${wide ? 'xl:grid-cols-4' : ''}`
    : 'sa-grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))]';

  return (
    <div className={grid}>
      {GENERAL_SECTIONS.map((s) => (
        <Panel key={s.title} title={s.title} tone={s.tone} readOnly={readOnly}
          className={`bg-white ${s.wide ? 'col-span-full' : ''}`} bodyClassName={fields(s.wide)}>
          {s.fields.map(renderField)}
          {s.title === 'Drillhole header' && failed && renderField(FAILURE_COMMENT)}
        </Panel>
      ))}
    </div>
  );
}
