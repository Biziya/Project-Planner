import { useId, type ReactNode } from 'react';
import { GRID, cellClass } from '../grid';
import { Icon } from '../Icon';
import { Select, type SelectOption } from '../Select';
import { LookupSelect } from '../ui';

export { GRID } from '../grid';

export interface GridColumn { label: ReactNode; align?: 'left' | 'right'; width?: string }

/** Spreadsheet-style table: outer rounded border, grey header, 1 px lines between all cells. */
export function GridTable({ columns, minWidth, children }: { columns: GridColumn[]; minWidth: string; children: ReactNode }) {
  return (
    <div className={GRID.wrap}>
      <table className={`${GRID.table} ${minWidth}`}>
        <thead><tr>
          {columns.map((c, n) => <th key={n} className={`${GRID.th} ${c.width ?? ''} ${c.align === 'right' ? 'text-right' : 'text-left'}`}>{c.label}</th>)}
        </tr></thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

interface CellProps { label: string; disabled?: boolean; error?: string }

/** Error message for screen readers; sighted users get it in the tooltip. */
function ErrorText({ error, id }: { error?: string; id?: string }) {
  return error ? <span id={id} className="tw-sr">{error}</span> : null;
}

export function NumberCell({ label, value, onChange, disabled, error }: CellProps & { value: number | null; onChange: (v: number | null) => void }) {
  const errorId = useId();
  return (
    <td className={cellClass({ align: 'right', disabled, error })} title={error}>
      <input aria-label={label} type="number" step="any" disabled={disabled} value={value ?? ''} aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined} className={`${GRID.control} ${GRID.number} text-right`}
        onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))} />
      <ErrorText error={error} id={errorId} />
    </td>
  );
}

export function TextCell({ label, value, onChange, disabled, error }: CellProps & { value: string | null; onChange: (v: string | null) => void }) {
  const errorId = useId();
  return (
    <td className={cellClass({ disabled, error })} title={error}>
      <input aria-label={label} disabled={disabled} value={value ?? ''} aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined} className={GRID.control} onChange={(e) => onChange(e.target.value || null)} />
      <ErrorText error={error} id={errorId} />
    </td>
  );
}

/** Dropdown cell: the value and a small chevron at the right edge, no box. */
export function SelectCell({ label, value, options, onChange, disabled, error }: CellProps & { options: SelectOption[]; value: string; onChange: (v: string) => void }) {
  return (
    <td className={cellClass({ disabled, error })} title={error}>
      <Select label={label} value={value} options={options} disabled={disabled} invalid={!!error} onChange={onChange} look="cell" />
      <ErrorText error={error} />
    </td>
  );
}

/** Dropdown cell filled from a lookup list (Lithology, CaCO3 risk). */
export function LookupCell({ lookup, label, value, onChange, disabled, error }: CellProps & { lookup: string; value: string | null; onChange: (v: string | null) => void }) {
  return (
    <td className={cellClass({ disabled, error })} title={error}>
      <LookupSelect id={lookup} label={label} value={value} disabled={disabled} invalid={!!error} onChange={onChange} look="cell" />
      <ErrorText error={error} />
    </td>
  );
}

/** Last column: a centred trash icon, grey, red on hover. */
export function DeleteCell({ onDelete }: { onDelete: () => void }) {
  return (
    <td className={`${GRID.td} ${GRID.del}`}>
      <button type="button" aria-label="Delete row" title="Delete row" className={GRID.delButton} onClick={onDelete}><Icon name="trash" /></button>
    </td>
  );
}

/** First issue message for one cell: issues naming the row (1-based) and the column, e.g. field "Intervals.From". */
export function cellError(issues: { row: number | null; field: string; level: string; message: string }[], row: number, field: string) {
  return issues.find((i) => i.row === row + 1 && i.field === field && i.level === 'Error')?.message;
}
