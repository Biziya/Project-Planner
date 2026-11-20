import { useState } from 'react';
import { api, ApiError, type Hole, type ImportSummary, type SendItem } from '../api/api';
import { ALL_FIELDS } from '../api/fields';
import { LookupSelect, Modal } from './ui';

const show = (v: unknown) => (v === null || v === undefined || v === '' ? '—' : String(v));

/** Field-by-field comparison of two versions of a hole (X-05). */
function DiffTable({ mine, theirs }: { mine: Hole; theirs: Hole }) {
  const rows = ALL_FIELDS.filter((f) => show(mine[f.key]) !== show(theirs[f.key]));
  const intervalsDiffer = JSON.stringify(mine.intervals) !== JSON.stringify(theirs.intervals);
  const gtnDiffer = JSON.stringify(mine.gtn) !== JSON.stringify(theirs.gtn);
  return (
    <section className="sa-tablecard" style={{ boxShadow: 'none' }}>
      <div className="sa-tablewrap">
        <table className="sa-table">
          <thead><tr><th>Field</th><th>Your version</th><th>acQuire version</th></tr></thead>
          <tbody>
            {rows.map((f) => (
              <tr key={f.key as string}><th scope="row" className="tw-rowhead">{f.label}</th><td className="id">{show(mine[f.key])}</td><td className="id">{show(theirs[f.key])}</td></tr>
            ))}
            {intervalsDiffer && <tr><th scope="row" className="tw-rowhead">Drilling intervals</th><td>{mine.intervals.length} rows</td><td>{theirs.intervals.length} rows</td></tr>}
            {gtnDiffer && <tr><th scope="row" className="tw-rowhead">GTN panel</th><td>{mine.gtn.length} rows</td><td>{theirs.gtn.length} rows</td></tr>}
            {rows.length === 0 && !intervalsDiffer && !gtnDiffer && <tr><td colSpan={3} className="sa-muted">No field differs; only the version changed.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function ConflictDialog({ mine, theirs, onKeepMine, onKeepTheirs, onClose }: {
  mine: Hole; theirs: Hole; onKeepMine: () => void; onKeepTheirs: () => void; onClose: () => void;
}) {
  return (
    <Modal title="This hole changed in acQuire" onClose={onClose}
      footer={<><button className="sa-btn sa-btn--secondary" onClick={onKeepTheirs}>Keep acQuire version</button><button className="sa-btn sa-btn--primary" onClick={onKeepMine}>Keep my version</button></>}>
      <div className="sa-note sa-note--warning"><b className="sa-mono">{mine.holeId}</b> was changed in acQuire after you opened it. Nothing has been saved yet: choose which version to keep.</div>
      <DiffTable mine={mine} theirs={theirs} />
    </Modal>
  );
}

export function GtnImportDialog({ onClose, onDone }: { onClose: () => void; onDone: (s: ImportSummary) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<'replace' | 'add'>('replace');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const run = async () => {
    if (!file) return;
    setBusy(true); setError(null);
    try { const r = await api.importGtn(file, mode); setResult(r); onDone(r); }
    catch (e) { setError(e instanceof ApiError ? e.message : 'Import failed.'); }
    finally { setBusy(false); }
  };
  return (
    <Modal title="Import GTN panels" onClose={onClose}
      footer={<><button className="sa-btn sa-btn--tertiary" onClick={onClose}>{result ? 'Close' : 'Cancel'}</button>
        {!result && <button className="sa-btn sa-btn--primary" disabled={!file || busy} onClick={run}>{busy ? 'Importing…' : 'Import'}</button>}</>}>
      <label className="sa-dropzone" style={{ display: 'block', cursor: 'pointer' }}>
        {file ? <b>{file.name}</b> : 'Choose the GTN Excel file (Export Excel › GTN template).'}
        <input type="file" accept=".xlsx" className="tw-sr" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      </label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span className="sa-field__label">For holes that already have GTN intervals</span>
        <span className="sa-seg" role="radiogroup" aria-label="Import mode">
          <button role="radio" aria-checked={mode === 'replace'} onClick={() => setMode('replace')}><span className={mode === 'replace' ? 'is-active' : ''}>Replace existing intervals</span></button>
          <button role="radio" aria-checked={mode === 'add'} onClick={() => setMode('add')}><span className={mode === 'add' ? 'is-active' : ''}>Add to existing intervals</span></button>
        </span>
        <span className="caption sa-muted">{mode === 'replace' ? 'The planned GTN rows of each hole in the file are deleted, then replaced by the file rows.' : 'New rows are added; a hole is refused if they overlap its existing intervals.'}</span>
      </div>
      {error && <div className="sa-note sa-note--danger">{error}</div>}
      {result && <ImportIssues summary={result} />}
    </Modal>
  );
}

function ImportIssues({ summary }: { summary: ImportSummary }) {
  return (
    <>
      <div className="sa-note sa-note--success"><b>{summary.holesWritten}</b> holes updated · {summary.rowsRead} rows read</div>
      {summary.issues.length > 0 && (
        <section className="sa-tablecard" style={{ boxShadow: 'none' }}>
          <div className="sa-tablecard__head"><span className="sa-tablecard__title" style={{ fontSize: 15 }}>{summary.issues.length} messages</span></div>
          <div className="sa-tablewrap" style={{ maxHeight: 320 }}>
            <table className="sa-table sa-table--compact">
              <thead><tr><th className="num">Row</th><th>HOLEID</th><th>Level</th><th>Message</th></tr></thead>
              <tbody>{summary.issues.map((i, n) => (
                <tr key={n}><td className="num">{i.row || '—'}</td><td className="id">{i.holeId ?? '—'}</td><td>{i.level}</td><td style={{ whiteSpace: 'normal' }}>{i.message}</td></tr>
              ))}</tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}

export function ImportReportDialog({ summary, onClose }: { summary: ImportSummary; onClose: () => void }) {
  return (
    <Modal title="Excel import" onClose={onClose} footer={<button className="sa-btn sa-btn--primary" onClick={onClose}>Close</button>}>
      <ImportIssues summary={summary} />
    </Modal>
  );
}

export function SendResultDialog({ results, onClose }: { results: SendItem[]; onClose: () => void }) {
  const [resolved, setResolved] = useState<Record<string, string>>({});
  const imported = results.filter((r) => r.outcome === 'Imported');
  const notSent = results.filter((r) => r.outcome === 'NotSent' || r.outcome === 'Failed');
  const conflicts = results.filter((r) => r.outcome === 'Conflict');
  const resolve = async (r: SendItem, keep: 'mine' | 'acquire') => {
    try { await api.resolve(r.stagingId, keep); setResolved((s) => ({ ...s, [r.stagingId]: keep === 'mine' ? 'Your version was written to acQuire.' : 'The draft was discarded; acQuire is unchanged.' })); }
    catch (e) { setResolved((s) => ({ ...s, [r.stagingId]: e instanceof ApiError ? e.message : 'Failed.' })); }
  };
  return (
    <Modal title="Import result" onClose={onClose} footer={<button className="sa-btn sa-btn--primary" onClick={onClose}>Close and update the list</button>}>
      <p className="sa-muted" style={{ margin: 0, fontSize: 13 }}>acQuire checked the batch and each HOLEID before importing.</p>
      {imported.length > 0 && <div className="sa-note sa-note--success"><b>{imported.length} {imported.length === 1 ? 'hole' : 'holes'}</b> imported to acQuire; their status is now PROJECT.</div>}
      {notSent.length > 0 && (
        <div className="sa-note sa-note--neutral"><b>{notSent.length} {notSent.length === 1 ? 'hole' : 'holes'}</b> not sent:
          {notSent.map((r) => <div key={r.stagingId}><span className="sa-mono">{r.holeId}</span> – {r.message}</div>)}</div>
      )}
      {conflicts.map((r) => (
        <section key={r.stagingId} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div className="sa-note sa-note--warning"><b className="sa-mono">{r.holeId}</b> already exists in acQuire. Choose which version to keep.</div>
          {r.mine && r.inAcquire && <DiffTable mine={r.mine} theirs={r.inAcquire} />}
          {resolved[r.stagingId]
            ? <span className="caption">{resolved[r.stagingId]}</span>
            : <div style={{ display: 'flex', gap: 8 }}>
                <button className="sa-btn sa-btn--secondary sa-btn--sm" onClick={() => resolve(r, 'acquire')}>Keep acQuire version</button>
                <button className="sa-btn sa-btn--primary sa-btn--sm" onClick={() => resolve(r, 'mine')}>Keep my version</button>
              </div>}
        </section>
      ))}
    </Modal>
  );
}

export function PrefillDialog({ onClose }: { onClose: () => void }) {
  const [v, setV] = useState<{ project: string | null; prospect: string | null; purpose: string | null; subPurpose: string | null; drillType: string | null; rows: number }>(
    { project: null, prospect: null, purpose: null, subPurpose: null, drillType: null, rows: 20 });
  const url = api.templateUrl('prefilled', v);
  return (
    <Modal title="Pre-filled Excel template" onClose={onClose} width={560}
      footer={<><button className="sa-btn sa-btn--tertiary" onClick={onClose}>Cancel</button><a className="sa-btn sa-btn--primary" href={url} onClick={onClose} style={{ textDecoration: 'none' }}>Download template</a></>}>
      <p className="sa-muted" style={{ margin: 0, fontSize: 13 }}>Values set here are written on every row. Leave a field empty to fill it in Excel.</p>
      <div className="sa-grid sa-grid--2">
        <label className="sa-field"><span className="sa-field__label">Project</span><LookupSelect id="L01" label="Project" value={v.project} onChange={(x) => setV({ ...v, project: x, prospect: null })} /></label>
        <label className="sa-field"><span className="sa-field__label">Campaign</span><LookupSelect id="L02" parent={v.project} label="Campaign" value={v.prospect} onChange={(x) => setV({ ...v, prospect: x })} /></label>
        <label className="sa-field"><span className="sa-field__label">Purpose</span><LookupSelect id="L06" label="Purpose" value={v.purpose} onChange={(x) => setV({ ...v, purpose: x, subPurpose: null })} /></label>
        <label className="sa-field"><span className="sa-field__label">Sub purpose</span><LookupSelect id="L07" parent={v.purpose} label="Sub purpose" value={v.subPurpose} onChange={(x) => setV({ ...v, subPurpose: x })} /></label>
        <label className="sa-field"><span className="sa-field__label">Planned drill type</span><LookupSelect id="L09" label="Planned drill type" value={v.drillType} onChange={(x) => setV({ ...v, drillType: x })} /></label>
        <label className="sa-field"><span className="sa-field__label">Number of rows</span>
          <span className="sa-input"><input type="number" min={1} max={1000} value={v.rows} onChange={(e) => setV({ ...v, rows: Number(e.target.value) || 1 })} /><span className="sa-input__unit">rows</span></span></label>
      </div>
    </Modal>
  );
}
