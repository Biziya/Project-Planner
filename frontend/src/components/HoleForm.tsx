import { useEffect, useState } from 'react';
import { api, type Hole, type HoleStatus, type Interval, type Issue, type GtnRow, type KeySuggestion } from '../api/api';
import { COMMENT_FIELDS, CONSTRUCTION_FIELDS, GENERAL_SECTIONS, MANDATORY, issueKey, type FieldDef } from '../api/fields';
import { Icon, LookupSelect, StatusChip } from './ui';

type Context = 'staging' | 'acquire';
type Tab = 'general' | 'construction' | 'gtn';

interface Props {
  hole: Hole;
  onChange: (hole: Hole) => void;
  issues: Issue[];
  context: Context;
  savedStatus: HoleStatus;            // status as stored (drives buttons)
  isSupervisor: boolean;
  dirty: boolean;
  busy?: boolean;
  inModal?: boolean;
  onSave: () => void;
  onClose?: () => void;
  onValidate?: () => void;
  onRollback?: () => void;
  onImportGtn?: () => void;
  saveLabel?: string;
}

const statusChoices: Partial<Record<HoleStatus, HoleStatus[]>> = {
  PROJECT: ['PROJECT', 'PROGRAM_TOVALIDATE', 'FAILED'],
  PROGRAM_TOVALIDATE: ['PROGRAM_TOVALIDATE', 'PROJECT', 'FAILED'],
};

const isEmpty = (v: unknown) => v === null || v === undefined || (typeof v === 'string' && v.trim() === '');

export function HoleForm(p: Props) {
  const [tab, setTab] = useState<Tab>('general');
  const [keyHint, setKeyHint] = useState<KeySuggestion | null>(null);
  // Suggested KEY (highest KEY of all holes + 1): information only, never filled in automatically.
  // Refreshed when the form opens and after each save.
  useEffect(() => {
    if (p.dirty) return;
    let alive = true;
    api.suggestKey().then((k) => alive && setKeyHint(k)).catch(() => alive && setKeyHint(null));
    return () => { alive = false; };
  }, [p.dirty, p.hole.holeId]);
  const { hole } = p;
  const readOnly = p.savedStatus === 'PROGRAM_VALIDATED' || p.savedStatus === 'FAILED';
  const set = (patch: Partial<Hole>) => p.onChange({ ...hole, ...patch });

  const fieldIssues = (key: string) => p.issues.filter((i) => issueKey(i.field) === key);
  const isLocked = (f: FieldDef) => readOnly || f.kind === 'auto' || (p.context === 'acquire' && !!f.lockedInAcquire);
  const missing = (f: FieldDef) => MANDATORY.has(f.key) && !isLocked(f) && isEmpty(hole[f.key]);
  const emptyCount = [...GENERAL_SECTIONS.flatMap((s) => s.fields)].filter(missing).length
    + (hole.status === 'FAILED' && isEmpty(hole.failureComment) ? 1 : 0);
  const errors = p.issues.filter((i) => i.level === 'Error');
  const warnings = p.issues.filter((i) => i.level === 'Warning');

  const renderField = (f: FieldDef) => {
    const locked = isLocked(f);
    const own = fieldIssues(f.key as string);
    const invalid = own.some((i) => i.level === 'Error') || missing(f);
    const value = hole[f.key] as string | number | null | undefined;
    let control;
    if (f.kind === 'status') {
      const choices = p.context === 'acquire' && !readOnly ? statusChoices[p.savedStatus] : undefined;
      control = choices
        ? <span className="sa-input"><select aria-label={f.label} value={hole.status} onChange={(e) => set({ status: e.target.value as HoleStatus })}>
            {choices.map((s) => <option key={s} value={s}>{s}</option>)}</select></span>
        : <span className="sa-input is-readonly"><span style={{ flex: 1 }}>{hole.status}</span></span>;
    } else if (locked) {
      control = (
        <span className="sa-input is-readonly">
          <span style={{ flex: 1, fontFamily: f.mono ? 'var(--font-mono)' : undefined }}>{isEmpty(value) ? '—' : String(value)}</span>
          {f.unit && <span className="sa-input__unit">{f.unit}</span>}
          {!readOnly && <Icon name="lock" />}
        </span>
      );
    } else if (f.kind === 'lookup') {
      const parent = f.parent ? (hole[f.parent] as string | null | undefined) : undefined;
      control = <LookupSelect id={f.lookup!} parent={f.parent ? parent ?? null : undefined} value={value as string} label={f.label} invalid={invalid}
        onChange={(v) => set({ [f.key]: v } as Partial<Hole>)} />;
    } else {
      control = (
        <span className={`sa-input${invalid ? ' is-invalid' : ''}`}>
          <input
            aria-label={f.label}
            type={f.kind === 'number' ? 'number' : f.kind === 'date' ? 'date' : 'text'}
            inputMode={f.digits ? 'numeric' : undefined}
            step={f.kind === 'number' ? 'any' : undefined}
            value={value ?? ''}
            style={{ fontFamily: f.mono ? 'var(--font-mono)' : undefined }}
            onChange={(e) => {
              const raw = e.target.value;
              const v = f.kind === 'number' ? (raw === '' ? null : Number(raw)) : raw === '' ? null : raw;
              set({ [f.key]: f.key === 'holeId' ? String(raw).toUpperCase() : v } as Partial<Hole>);
            }}
          />
          {f.unit && <span className="sa-input__unit">{f.unit}</span>}
        </span>
      );
    }
    return (
      <label className="sa-field" key={f.key as string}>
        <span className="sa-field__label">{f.label}{MANDATORY.has(f.key) && <span className="req"> *</span>}</span>
        {control}
        {own.map((i, n) => <span key={n} className="sa-field__error" style={i.level === 'Warning' ? { color: 'var(--warning)' } : undefined}>{i.message}</span>)}
        {!own.length && missing(f) && <span className="sa-field__error">Mandatory: fill it in before sending.</span>}
        {f.key === 'technoWellKey' && !locked && keyHint && (
          <span className="sa-field__help" title={`Highest KEY in acQuire (all statuses): ${keyHint.maxInAcquire ?? '—'} · in drafts: ${keyHint.maxInStaging ?? '—'}`}>
            Suggested KEY: <b className="sa-mono">{keyHint.suggested}</b>{keyHint.acquireIncluded ? '' : ' (drafts only: acQuire not connected yet)'}
          </span>
        )}
      </label>
    );
  };

  // ------------------------------------------------ intervals
  const setInterval = (n: number, patch: Partial<Interval>) => set({ intervals: hole.intervals.map((r, i) => (i === n ? { ...r, ...patch } : r)) });
  const addInterval = () => {
    const last = hole.intervals[hole.intervals.length - 1];
    set({ intervals: [...hole.intervals, { type: 'Destructive', from: last?.to ?? 0, to: null, recovery: null, comment: null }] });
  };
  const reach = hole.intervals.reduce((m, r) => Math.max(m, r.to ?? 0), 0);

  // ------------------------------------------------ GTN
  const setGtn = (n: number, patch: Partial<GtnRow>) => set({ gtn: hole.gtn.map((r, i) => (i === n ? { ...r, ...patch } : r)) });
  const addGtn = () => {
    const last = hole.gtn[hole.gtn.length - 1];
    set({ gtn: [...hole.gtn, { from: last?.to ?? 0, to: null, lithology: null, caCO3Risk: null }] });
  };

  const num = (v: number | null, onChange: (v: number | null) => void, label: string, disabled = false) => (
    <span className={`sa-input${disabled ? ' is-readonly' : ''}`}>
      <input aria-label={label} type="number" step="any" disabled={disabled} value={v ?? ''} style={{ textAlign: 'right' }}
        onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))} />
    </span>
  );
  const tableIssues = (field: string) => p.issues.filter((i) => i.field === field);

  const canValidate = p.context === 'acquire' && p.savedStatus === 'PROGRAM_TOVALIDATE' && p.isSupervisor && !p.dirty;
  const where = p.context === 'staging' ? `Not yet in acQuire${hole.source ? ' · ' + hole.source : ''}` : readOnly ? 'Read only' : 'In acQuire';

  return (
    <div className={p.inModal ? 'sa-modal tw-form tw-form--modal' : 'sa-split__detail tw-form'}>
      <div className="sa-detail__head">
        <span className="overline sa-muted">Hole</span>
        <b style={{ font: '600 16px/24px var(--font-mono)' }}>{hole.holeId || 'New drillhole'}</b>
        <StatusChip status={p.savedStatus} />
        <span className="caption sa-muted">{where}</span>
        <span style={{ marginLeft: 'auto' }} />
        {p.onClose && <button className="sa-btn sa-btn--icon sa-btn--sm" aria-label="Close" onClick={p.onClose}><Icon name="close" /></button>}
      </div>

      <div className="sa-tabs" role="tablist" style={{ padding: '0 16px' }}>
        {([['general', 'General'], ['construction', 'Drilling construction planned'], ['gtn', 'GTN panel']] as [Tab, string][]).map(([k, label]) => (
          <span key={k} className={tab === k ? 'is-active' : ''}>
            <button role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>{label}</button>
          </span>
        ))}
      </div>

      <div className="sa-detail__body">
        {(errors.length > 0 || warnings.length > 0) && (
          <div role="alert" className={`sa-note ${errors.length ? 'sa-note--danger' : 'sa-note--warning'}`}>
            <b>{errors.length ? `${errors.length} ${errors.length === 1 ? 'issue' : 'issues'} to fix before sending` : `${warnings.length} ${warnings.length === 1 ? 'warning' : 'warnings'} to check`}</b>
            {[...errors, ...warnings].map((i, n) => <div key={n}>{i.message}</div>)}
          </div>
        )}

        {tab === 'general' && (
          <div className="tw-sections">
            {GENERAL_SECTIONS.map((s) => (
              <section key={s.title} className={`sa-section sa-section--${s.tone}`} style={{ gridColumn: s.wide ? '1 / -1' : undefined }}>
                <div className="sa-section__head"><h3 className="sa-section__title">{s.title}</h3><span className="sa-section__meta">{readOnly ? 'Read only' : 'Edit mode'}</span></div>
                <div className="sa-section__body">
                  <div className="sa-grid tw-grid">
                    {s.fields.map(renderField)}
                    {s.title === 'Drillhole header' && hole.status === 'FAILED' && (
                      <label className="sa-field">
                        <span className="sa-field__label">Failure comment<span className="req"> *</span></span>
                        <span className={`sa-input${isEmpty(hole.failureComment) ? ' is-invalid' : ''}${readOnly ? ' is-readonly' : ''}`}>
                          <input aria-label="Failure comment" disabled={readOnly} placeholder="Why was this hole cancelled?" value={hole.failureComment ?? ''}
                            onChange={(e) => set({ failureComment: e.target.value || null })} />
                        </span>
                        {isEmpty(hole.failureComment) && <span className="sa-field__error">Explain why the hole is cancelled.</span>}
                      </label>
                    )}
                  </div>
                </div>
              </section>
            ))}
          </div>
        )}

        {tab === 'construction' && (
          <section className="sa-section sa-section--camel">
            <div className="sa-section__head"><h3 className="sa-section__title">Planned drilling construction</h3><span className="sa-section__meta">{readOnly ? 'Read only' : 'Edit mode'}</span></div>
            <div className="sa-section__body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="sa-tablecard" style={{ boxShadow: 'none' }}>
                <div className="sa-tablewrap">
                  <table className="sa-table sa-table--compact" style={{ minWidth: 640, tableLayout: 'fixed' }}>
                    <thead><tr><th style={{ width: 150 }}>Interval</th><th className="num" style={{ width: 120 }}>From (m)</th><th className="num" style={{ width: 120 }}>To (m)</th><th className="num" style={{ width: 100 }}>Rec (%)</th><th>End of range comment</th><th style={{ width: 48 }}><span className="tw-sr">Row actions</span></th></tr></thead>
                    <tbody>
                      {hole.intervals.map((r, n) => (
                        <tr key={n}>
                          <td><span className={`sa-input${readOnly ? ' is-readonly' : ''}`}><select aria-label={`Interval type, row ${n + 1}`} disabled={readOnly} value={r.type}
                            onChange={(e) => setInterval(n, e.target.value === 'Destructive' ? { type: 'Destructive', recovery: null, comment: null } : { type: 'Core' })}>
                            <option>Destructive</option><option>Core</option></select></span></td>
                          <td>{num(r.from, (v) => setInterval(n, { from: v }), `From, row ${n + 1}`, readOnly)}</td>
                          <td>{num(r.to, (v) => setInterval(n, { to: v }), `To, row ${n + 1}`, readOnly)}</td>
                          <td>{num(r.recovery, (v) => setInterval(n, { recovery: v }), `Recovery, row ${n + 1}`, readOnly || r.type !== 'Core')}</td>
                          <td><span className={`sa-input${readOnly || r.type !== 'Core' ? ' is-readonly' : ''}`}><input aria-label={`Comment, row ${n + 1}`} disabled={readOnly || r.type !== 'Core'}
                            value={r.comment ?? ''} onChange={(e) => setInterval(n, { comment: e.target.value || null })} /></span></td>
                          <td className="sa-rowaction">{!readOnly && <button className="sa-btn sa-btn--icon sa-btn--sm" aria-label={`Delete interval ${n + 1}`}
                            onClick={() => set({ intervals: hole.intervals.filter((_, i) => i !== n) })}><Icon name="trash" /></button>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {hole.intervals.length === 0 && <p className="sa-muted" style={{ margin: 0, padding: 16 }}>No interval yet. Intervals can be added later.</p>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                {!readOnly && <button className="sa-btn sa-btn--secondary sa-btn--sm" onClick={addInterval}><Icon name="plus" />Add interval</button>}
                <span className="caption sa-muted">Intervals reach {reach} m{hole.holePlanDepth != null ? ` · planned depth ${hole.holePlanDepth} m` : ''} · up to 4 destructive and 3 core intervals</span>
              </div>
              {tableIssues('Intervals').map((i, n) => <span key={n} className="sa-field__error">{i.message}</span>)}
              <div className="sa-grid tw-grid">{CONSTRUCTION_FIELDS.map(renderField)}</div>
              <div className="sa-grid tw-grid tw-grid--wide">{COMMENT_FIELDS.map(renderField)}</div>
            </div>
          </section>
        )}

        {tab === 'gtn' && (
          <section className="sa-section sa-section--uranium">
            <div className="sa-section__head"><h3 className="sa-section__title">GTN panel</h3><span className="sa-section__meta">{readOnly ? 'Read only' : 'Edit mode'}</span></div>
            <div className="sa-section__body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="sa-tablecard" style={{ boxShadow: 'none' }}>
                <div className="sa-tablewrap">
                  <table className="sa-table sa-table--compact" style={{ minWidth: 560, tableLayout: 'fixed' }}>
                    <thead><tr><th className="num" style={{ width: 130 }}>GTN_FROM (m)</th><th className="num" style={{ width: 130 }}>GTN_TO (m)</th><th>Lithology</th><th style={{ width: 160 }}>CaCO3 risk</th><th style={{ width: 48 }}><span className="tw-sr">Row actions</span></th></tr></thead>
                    <tbody>
                      {hole.gtn.map((g, n) => (
                        <tr key={n}>
                          <td>{num(g.from, (v) => setGtn(n, { from: v }), `GTN_FROM, row ${n + 1}`, readOnly)}</td>
                          <td>{num(g.to, (v) => setGtn(n, { to: v }), `GTN_TO, row ${n + 1}`, readOnly)}</td>
                          <td><LookupSelect id="L15" value={g.lithology} label={`Lithology, row ${n + 1}`} disabled={readOnly} onChange={(v) => setGtn(n, { lithology: v })} /></td>
                          <td><LookupSelect id="L16" value={g.caCO3Risk} label={`CaCO3 risk, row ${n + 1}`} disabled={readOnly} onChange={(v) => setGtn(n, { caCO3Risk: v })} /></td>
                          <td className="sa-rowaction">{!readOnly && <button className="sa-btn sa-btn--icon sa-btn--sm" aria-label={`Delete GTN row ${n + 1}`}
                            onClick={() => set({ gtn: hole.gtn.filter((_, i) => i !== n) })}><Icon name="trash" /></button>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {hole.gtn.length === 0 && <p className="sa-muted" style={{ margin: 0, padding: 16 }}>No GTN interval yet.</p>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                {!readOnly && <button className="sa-btn sa-btn--secondary sa-btn--sm" onClick={addGtn}><Icon name="plus" />Add GTN interval</button>}
                {!readOnly && p.onImportGtn && <button className="sa-btn sa-btn--secondary sa-btn--sm" onClick={p.onImportGtn}>Import from Excel</button>}
              </div>
              <span className="caption sa-muted">A row can hold the lithology, the CaCO3 risk, or both, when the two attributes do not share the same intervals.</span>
              {tableIssues('Gtn').map((i, n) => <span key={n} className="sa-field__error">{i.message}</span>)}
            </div>
          </section>
        )}
      </div>

      <div className="sa-detail__foot" style={{ flexWrap: 'wrap' }}>
        <span className="caption sa-muted"><span style={{ color: 'var(--danger)' }}>*</span> mandatory · {emptyCount} empty
          {p.context === 'acquire' && p.savedStatus === 'PROJECT' ? ' · set Status to PROGRAM_TOVALIDATE and save to validate' : ''}</span>
        <span style={{ marginLeft: 'auto' }} />
        {p.savedStatus === 'PROGRAM_VALIDATED' && p.onRollback && <button className="sa-btn sa-btn--tertiary" disabled={p.busy} onClick={p.onRollback}>Roll back to picket</button>}
        {!readOnly && (
          <button className={`sa-btn ${p.context === 'staging' ? 'sa-btn--primary' : 'sa-btn--secondary'}`} disabled={p.busy} onClick={p.onSave}>
            {p.saveLabel ?? (p.context === 'staging' ? 'Save draft' : 'Save hole')}
          </button>
        )}
        {p.context === 'acquire' && !readOnly && p.onValidate && (
          <button className="sa-btn sa-btn--primary" disabled={!canValidate || p.busy} onClick={p.onValidate}
            title={!p.isSupervisor ? 'Supervisors only' : p.dirty ? 'Save your changes first' : p.savedStatus !== 'PROGRAM_TOVALIDATE' ? 'Status must be PROGRAM_TOVALIDATE' : undefined}>
            <Icon name="check" />Validate for drilling
          </button>
        )}
      </div>
    </div>
  );
}
