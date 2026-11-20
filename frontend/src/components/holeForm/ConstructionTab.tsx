import type { ReactNode } from 'react';
import type { Hole, Interval, Issue } from '../../api/api';
import { COMMENT_FIELDS, CONSTRUCTION_FIELDS, type FieldDef } from '../../api/fields';
import { Icon } from '../Icon';
import { useSheetsLook } from '../sheets';
import { ActionButton } from './ActionButton';
import { DeleteCell, GridTable, NumberCell, SelectCell, TextCell, cellError } from './GridTable';
import { Panel } from './Panel';

const INTERVAL_TYPES = [{ value: 'Destructive', label: 'Destructive' }, { value: 'Core', label: 'Core' }];

const COLUMNS = [
  { label: 'Interval', width: 'w-[150px]' }, { label: 'From (m)', align: 'right', width: 'w-[120px]' }, { label: 'To (m)', align: 'right', width: 'w-[120px]' },
  { label: 'Rec (%)', align: 'right', width: 'w-[100px]' }, { label: 'End of range comment' },
] as const;

interface ConstructionTabProps {
  hole: Hole;
  onChange: (patch: Partial<Hole>) => void;
  readOnly: boolean;
  issues: Issue[];
  renderField: (f: FieldDef) => ReactNode;
}

export function ConstructionTab({ hole, onChange, readOnly, issues, renderField }: ConstructionTabProps) {
  const sheets = useSheetsLook();
  const { intervals } = hole;
  const setRow = (n: number, patch: Partial<Interval>) => onChange({ intervals: intervals.map((r, i) => (i === n ? { ...r, ...patch } : r)) });
  const addRow = () => {
    const last = intervals[intervals.length - 1];
    onChange({ intervals: [...intervals, { type: 'Destructive', from: last?.to ?? 0, to: null, recovery: null, comment: null }] });
  };
  const reach = intervals.reduce((m, r) => Math.max(m, r.to ?? 0), 0);
  const measureGrid = sheets ? 'grid gap-4 sm:grid-cols-2 xl:grid-cols-4' : 'sa-grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))]';
  const commentGrid = sheets ? 'grid gap-4 sm:grid-cols-2 xl:grid-cols-3' : 'sa-grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))]';

  return (
    <Panel title="Planned drilling construction" tone="camel" readOnly={readOnly} bodyClassName="flex flex-col gap-4">
      <div>
        <GridTable minWidth="min-w-[640px]" columns={[...COLUMNS, ...(readOnly ? [] : [{ label: <span className="tw-sr">Delete row</span>, width: 'w-10' }])]}>
          {intervals.map((r, n) => {
            const coreOnly = readOnly || r.type !== 'Core';
            const err = (col: string) => cellError(issues, n, `Intervals.${col}`);
            return (
              <tr key={n}>
                <SelectCell label={`Interval type, row ${n + 1}`} value={r.type} options={INTERVAL_TYPES} disabled={readOnly} error={err('Type')}
                  onChange={(v) => setRow(n, v === 'Destructive' ? { type: 'Destructive', recovery: null, comment: null } : { type: 'Core' })} />
                <NumberCell label={`From, row ${n + 1}`} value={r.from} disabled={readOnly} error={err('From')} onChange={(v) => setRow(n, { from: v })} />
                <NumberCell label={`To, row ${n + 1}`} value={r.to} disabled={readOnly} error={err('To')} onChange={(v) => setRow(n, { to: v })} />
                <NumberCell label={`Recovery, row ${n + 1}`} value={r.recovery} disabled={coreOnly} error={err('Recovery')} onChange={(v) => setRow(n, { recovery: v })} />
                <TextCell label={`Comment, row ${n + 1}`} value={r.comment} disabled={coreOnly} error={err('Comment')} onChange={(v) => setRow(n, { comment: v })} />
                {!readOnly && <DeleteCell onDelete={() => onChange({ intervals: intervals.filter((_, i) => i !== n) })} />}
              </tr>
            );
          })}
        </GridTable>
        {intervals.length === 0 && <p className="sa-muted m-0 p-4">No interval yet. Intervals can be added later.</p>}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {!readOnly && <ActionButton variant="neutral" legacy="sa-btn--secondary" size="sm" onClick={addRow}><Icon name="plus" />Add interval</ActionButton>}
        <span className="caption sa-muted">Intervals reach {reach} m{hole.holePlanDepth != null ? ` · planned depth ${hole.holePlanDepth} m` : ''} · up to 4 destructive and 3 core intervals</span>
      </div>
      {issues.filter((i) => i.field === 'Intervals').map((i, n) => <span key={n} className="sa-field__error">{i.message}</span>)}
      <div className={measureGrid}>{CONSTRUCTION_FIELDS.map(renderField)}</div>
      <div className={commentGrid}>{COMMENT_FIELDS.map(renderField)}</div>
    </Panel>
  );
}
