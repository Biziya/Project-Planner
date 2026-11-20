import type { ReactNode } from 'react';
import type { Hole, HoleStatus, Issue } from '../../api/api';
import type { FieldDef } from '../../api/fields';
import { Icon } from '../Icon';
import { Select } from '../Select';
import { useControlFrame } from '../sheets';
import { LookupSelect } from '../ui';

type Value = string | number | null | undefined;

interface FormFieldProps {
  field: FieldDef;
  value: Value;
  onChange: (patch: Partial<Hole>) => void;
  required: boolean;
  locked: boolean;
  /** Lock icon on locked fields (not shown when the whole hole is read only). */
  showLock: boolean;
  missing: boolean;
  missingText: string;
  issues: Issue[];
  /** Status choices when the status can be changed in this form. */
  statusOptions?: HoleStatus[];
  /** Value of the parent field of a cascading list (campaign by project…). */
  parentValue?: string | null;
  placeholder?: string;
  help?: ReactNode;
}

const isEmpty = (v: Value) => v === null || v === undefined || (typeof v === 'string' && v.trim() === '');

/** One labelled field of the hole form: the control that fits its kind, then its messages. */
export function FormField(p: FormFieldProps) {
  const { field: f } = p;
  const frame = useControlFrame();
  const invalid = p.issues.some((i) => i.level === 'Error') || p.missing;
  const set = (v: Value) => p.onChange({ [f.key]: v } as Partial<Hole>);

  let control: ReactNode;
  if (f.kind === 'status' && p.statusOptions) {
    control = <Select label={f.label} value={String(p.value)} options={p.statusOptions.map((s) => ({ value: s, label: s }))} onChange={set} />;
  } else if (p.locked || f.kind === 'status') {
    control = (
      <span className={frame('locked')}>
        <span className={`flex-1 ${f.mono ? 'font-mono' : ''}`}>{isEmpty(p.value) ? '—' : String(p.value)}</span>
        {f.unit && <span className="sa-input__unit">{f.unit}</span>}
        {p.showLock && f.kind !== 'status' && <Icon name="lock" />}
      </span>
    );
  } else if (f.kind === 'lookup') {
    control = <LookupSelect id={f.lookup ?? ''} parent={p.parentValue} value={p.value as string | null} label={f.label} invalid={invalid} onChange={set} />;
  } else {
    control = (
      <span className={frame(invalid ? 'invalid' : 'normal')}>
        <input
          aria-label={f.label}
          type={f.kind === 'number' ? 'number' : f.kind === 'date' ? 'date' : 'text'}
          inputMode={f.digits ? 'numeric' : undefined}
          step={f.kind === 'number' ? 'any' : undefined}
          placeholder={p.placeholder}
          value={p.value ?? ''}
          className={f.mono ? '!font-mono' : undefined}
          onChange={(e) => {
            const raw = e.target.value;
            if (f.key === 'holeId') set(raw.toUpperCase());
            else if (f.kind === 'number') set(raw === '' ? null : Number(raw));
            else set(raw === '' ? null : raw);
          }}
        />
        {f.unit && <span className="sa-input__unit">{f.unit}</span>}
      </span>
    );
  }

  return (
    <label className="sa-field">
      <span className="sa-field__label">{f.label}{p.required && <span className="req"> *</span>}</span>
      {control}
      {p.issues.map((i, n) => (
        <span key={n} className={`sa-field__error ${i.level === 'Warning' ? 'text-[color:var(--warning)]' : ''}`}>{i.message}</span>
      ))}
      {!p.issues.length && p.missing && <span className="sa-field__error">{p.missingText}</span>}
      {p.help}
    </label>
  );
}
