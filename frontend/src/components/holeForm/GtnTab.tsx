import type { GtnRow, Hole, Issue } from '../../api/api';
import { Icon } from '../Icon';
import { ActionButton } from './ActionButton';
import { DeleteCell, GridTable, LookupCell, NumberCell, cellError } from './GridTable';
import { Panel } from './Panel';

const COLUMNS = [
  { label: 'GTN_FROM (m)', align: 'right', width: 'w-[130px]' }, { label: 'GTN_TO (m)', align: 'right', width: 'w-[130px]' },
  { label: 'Lithology' }, { label: 'CaCO3 risk', width: 'w-[160px]' },
] as const;

interface GtnTabProps {
  hole: Hole;
  onChange: (patch: Partial<Hole>) => void;
  readOnly: boolean;
  issues: Issue[];
  onImport?: () => void;
}

export function GtnTab({ hole, onChange, readOnly, issues, onImport }: GtnTabProps) {
  const { gtn } = hole;
  const setRow = (n: number, patch: Partial<GtnRow>) => onChange({ gtn: gtn.map((r, i) => (i === n ? { ...r, ...patch } : r)) });
  const addRow = () => {
    const last = gtn[gtn.length - 1];
    onChange({ gtn: [...gtn, { from: last?.to ?? 0, to: null, lithology: null, caCO3Risk: null }] });
  };

  return (
    <Panel title="GTN panel" tone="uranium" readOnly={readOnly} bodyClassName="flex flex-col gap-4">
      <div>
        <GridTable minWidth="min-w-[560px]" columns={[...COLUMNS, ...(readOnly ? [] : [{ label: <span className="tw-sr">Delete row</span>, width: 'w-10' }])]}>
          {gtn.map((g, n) => {
            const err = (col: string) => cellError(issues, n, `Gtn.${col}`);
            return (
              <tr key={n}>
                <NumberCell label={`GTN_FROM, row ${n + 1}`} value={g.from} disabled={readOnly} error={err('From')} onChange={(v) => setRow(n, { from: v })} />
                <NumberCell label={`GTN_TO, row ${n + 1}`} value={g.to} disabled={readOnly} error={err('To')} onChange={(v) => setRow(n, { to: v })} />
                <LookupCell lookup="L15" label={`Lithology, row ${n + 1}`} value={g.lithology} disabled={readOnly} error={err('Lithology')} onChange={(v) => setRow(n, { lithology: v })} />
                <LookupCell lookup="L16" label={`CaCO3 risk, row ${n + 1}`} value={g.caCO3Risk} disabled={readOnly} error={err('CaCO3Risk')} onChange={(v) => setRow(n, { caCO3Risk: v })} />
                {!readOnly && <DeleteCell onDelete={() => onChange({ gtn: gtn.filter((_, i) => i !== n) })} />}
              </tr>
            );
          })}
        </GridTable>
        {gtn.length === 0 && <p className="sa-muted m-0 p-4">No GTN interval yet.</p>}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {!readOnly && <ActionButton variant="neutral" legacy="sa-btn--secondary" size="sm" onClick={addRow}><Icon name="plus" />Add GTN interval</ActionButton>}
        {!readOnly && onImport && <ActionButton variant="import" legacy="sa-btn--secondary" size="sm" onClick={onImport}>Import from Excel</ActionButton>}
      </div>
      <span className="caption sa-muted">A row can hold the lithology, the CaCO3 risk, or both, when the two attributes do not share the same intervals.</span>
      {issues.filter((i) => i.field === 'Gtn').map((i, n) => <span key={n} className="sa-field__error">{i.message}</span>)}
    </Panel>
  );
}
