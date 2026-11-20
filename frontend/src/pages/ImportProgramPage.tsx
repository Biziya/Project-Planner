import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ApiError, emptyHole, type Hole, type ImportSummary, type Issue, type Me, type SendItem, type StagedHole } from '../api/api';
import { HoleForm } from '../components/HoleForm';
import { GtnImportDialog, ImportReportDialog, PrefillDialog, SendResultDialog } from '../components/Dialogs';
import { Banner, Icon, confirmDiscard, type Notice } from '../components/ui';

type Editing = { hole: Hole; original: string; issues: Issue[] };

/** Errors that block sending. A HOLEID already in acQuire (V-03) is sent anyway and resolved as a conflict (X-05). */
const blocking = (s: StagedHole) => s.issues.filter((i) => i.level === 'Error' && !(i.rule === 'V-03' && i.message.includes('acQuire'))).length;
const existsInAcquire = (s: StagedHole) => s.issues.some((i) => i.rule === 'V-03' && i.message.includes('acQuire'));

export function ImportProgramPage({ me }: { me: Me }) {
  const [rows, setRows] = useState<StagedHole[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<Editing | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [dialog, setDialog] = useState<'gtn' | 'prefill' | null>(null);
  const [report, setReport] = useState<ImportSummary | null>(null);
  const [sendResult, setSendResult] = useState<SendItem[] | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const fail = (e: unknown) => setNotice({ kind: 'danger', text: e instanceof ApiError ? e.message : 'Something went wrong. Try again.' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.listStaging();
      setRows(r);
      // ready holes are selected by default; holes with errors cannot be sent (B-04)
      setChecked(new Set(r.filter((x) => blocking(x) === 0).map((x) => x.hole.stagingId!)));
    } catch (e) { fail(e); } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  // ---------------- form pop-up
  const dirty = editing !== null && JSON.stringify(editing.hole) !== editing.original;
  const openForm = (s: StagedHole | null) => {
    const hole = s ? s.hole : emptyHole();
    setEditing({ hole, original: JSON.stringify(hole), issues: s ? s.issues : [] });
  };
  const closeForm = () => { if (confirmDiscard(dirty)) setEditing(null); };

  const checkTimer = useRef<number>();
  useEffect(() => {
    if (!editing || !dirty) return;
    window.clearTimeout(checkTimer.current);
    const h = editing.hole;
    checkTimer.current = window.setTimeout(async () => {
      try { const r = await api.validate(h); setEditing((e) => (e && e.hole === h ? { ...e, issues: r.issues } : e)); } catch { /* ignore */ }
    }, 600);
  }, [editing, dirty]);

  const saveDraft = async () => {
    if (!editing) return;
    setBusy(true);
    try {
      const r = editing.hole.stagingId ? await api.saveStaging(editing.hole) : await api.createStaging(editing.hole);
      setEditing({ hole: r.hole, original: JSON.stringify(r.hole), issues: r.issues });
      setNotice({ kind: 'success', text: `${r.hole.holeId || 'New drillhole'} saved in preparation${r.errorCount ? ` · ${r.errorCount} errors to fix before sending` : ' · ready to send'}.` });
      await load();
    } catch (e) { fail(e); } finally { setBusy(false); }
  };

  const remove = async (s: StagedHole) => {
    if (!window.confirm(`Delete the draft ${s.hole.holeId}? This cannot be undone.`)) return;
    try { await api.deleteStaging(s.hole.stagingId!); setNotice({ kind: 'success', text: `${s.hole.holeId} deleted.` }); await load(); } catch (e) { fail(e); }
  };

  // ---------------- Excel
  const importExcel = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try { setReport(await api.importHoles(file)); await load(); } catch (e) { fail(e); }
    finally { setBusy(false); if (fileInput.current) fileInput.current.value = ''; }
  };

  // ---------------- send
  const selectedIds = rows.filter((r) => checked.has(r.hole.stagingId!) && blocking(r) === 0).map((r) => r.hole.stagingId!);
  const send = async () => {
    setBusy(true);
    try { setSendResult(await api.send(selectedIds)); } catch (e) { fail(e); } finally { setBusy(false); }
  };

  const visible = rows.filter((r) => !search || r.hole.holeId.toUpperCase().includes(search.trim().toUpperCase()));
  const toggle = (id: string) => setChecked((c) => { const n = new Set(c); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const fmt = (v: number | null | undefined) => (v === null || v === undefined ? '—' : v.toLocaleString('en-US', { maximumFractionDigits: 3 }).replace(/,/g, '\u202f'));

  return (
    <>
      <div className="sa-pagehead" style={{ flexWrap: 'wrap' }}>
        <div>
          <span className="overline sa-muted">Program</span>
          <h1>Import program</h1>
          <p>Holes in Preparation, not yet in acQuire. Create, import and correct them, then send; they become PROJECT at the first import.</p>
        </div>
        <div className="sa-pagehead__actions" style={{ flexWrap: 'wrap', position: 'relative' }}>
          <button className="sa-btn sa-btn--secondary" onClick={() => openForm(null)}><Icon name="plus" />New drillhole</button>
          <button className="sa-btn sa-btn--secondary" disabled={busy} onClick={() => fileInput.current?.click()}>Import Excel</button>
          <input ref={fileInput} type="file" accept=".xlsx" className="tw-sr" onChange={(e) => importExcel(e.target.files?.[0])} />
          <button className="sa-btn sa-btn--secondary" aria-expanded={exportOpen} onClick={() => setExportOpen(!exportOpen)}>Export Excel<Icon name="chevron" /></button>
          <button className="sa-btn sa-btn--secondary" onClick={() => setDialog('gtn')}>Import GTN (Excel)</button>
          {exportOpen && (
            <div className="sa-popover" style={{ top: 'calc(var(--size-control-md) + 8px)', right: 0, width: 340 }} onMouseLeave={() => setExportOpen(false)}>
              <div className="sa-popover__head"><b>Export Excel</b></div>
              <div className="sa-popover__body" style={{ padding: 8 }}>
                <a className="tw-menuitem" href={api.templateUrl('empty')} onClick={() => setExportOpen(false)}><span>Empty template</span><span className="caption sa-muted">Column names and lookup lists only</span></a>
                <a className="tw-menuitem" href={api.stagingExportUrl()} onClick={() => setExportOpen(false)}><span>Staging table</span><span className="caption sa-muted">Your current drafts, to work offline or keep a copy</span></a>
                <button className="tw-menuitem" onClick={() => { setExportOpen(false); setDialog('prefill'); }}><span>Pre-filled template…</span><span className="caption sa-muted">Choose values to repeat on every row</span></button>
                <a className="tw-menuitem" href={api.templateUrl('gtn')} onClick={() => setExportOpen(false)}><span>GTN template</span><span className="caption sa-muted">HOLEID, GTN_FROM, GTN_TO, Lithology, CaCO3 risk</span></a>
              </div>
            </div>
          )}
        </div>
      </div>

      <Banner notice={notice} onClose={() => setNotice(null)} />

      <section className="sa-tablecard">
        <div className="sa-tablecard__head" style={{ flexWrap: 'wrap' }}>
          <h2 className="sa-tablecard__title" style={{ fontSize: 15, lineHeight: '22px' }}>Holes in preparation</h2>
          <span className="sa-tablecard__count">{loading ? 'Loading…' : `${rows.length} holes · ${selectedIds.length} selected`}</span>
          <label className="sa-input" style={{ width: 240, height: 'var(--size-control-sm)' }}><Icon name="search" />
            <input type="search" aria-label="Search HOLEID" placeholder="Search HOLEID" value={search} onChange={(e) => setSearch(e.target.value)} style={{ fontFamily: 'var(--font-mono)' }} /></label>
          <button className="sa-btn sa-btn--primary" disabled={selectedIds.length === 0 || busy} onClick={send}><Icon name="send" />Send to acQuire ({selectedIds.length})</button>
        </div>
        <div className="sa-tablewrap">
          <table className="sa-table" style={{ minWidth: 900 }}>
            <thead><tr><th style={{ width: '1%' }}>Send</th><th className="is-sorted">HOLEID <span className="sort">↑</span></th><th>Source</th><th>Purpose</th>
              <th className="num">X (m)</th><th className="num">Y (m)</th><th className="num">Z (m)</th><th>Checks</th><th><span className="tw-sr">Actions</span></th></tr></thead>
            <tbody>
              {visible.map((r) => {
                const id = r.hole.stagingId!;
                return (
                  <tr key={id} className={editing?.hole.stagingId === id ? 'is-open' : ''}>
                    <td><input type="checkbox" aria-label={`Send ${r.hole.holeId}`} disabled={blocking(r) > 0} checked={checked.has(id) && blocking(r) === 0} onChange={() => toggle(id)} /></td>
                    <td className="id"><button className="sa-idlink" onClick={() => openForm(r)}>{r.hole.holeId || '(no HOLEID)'}</button></td>
                    <td>{r.hole.source === 'excel' ? 'Excel' : 'Form'}</td>
                    <td>{r.hole.holePurpose ?? '—'}</td>
                    <td className="num id">{fmt(r.hole.x)}</td><td className="num id">{fmt(r.hole.y)}</td><td className="num id">{fmt(r.hole.z)}</td>
                    <td>{blocking(r) > 0
                      ? <span className="sa-status sa-status--danger">{blocking(r)} {blocking(r) === 1 ? 'error' : 'errors'}</span>
                      : existsInAcquire(r)
                        ? <span className="sa-status sa-status--warning" title="Sending will ask which version to keep">Exists in acQuire</span>
                        : <span className="sa-status sa-status--success">{r.warningCount ? `Ready · ${r.warningCount} warning${r.warningCount > 1 ? 's' : ''}` : 'Ready'}</span>}</td>
                    <td className="sa-rowaction"><button className="sa-btn sa-btn--icon sa-btn--sm" aria-label={`Delete ${r.hole.holeId}`} onClick={() => remove(r)}><Icon name="trash" /></button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!loading && rows.length === 0 && <p className="sa-muted" style={{ margin: 0, padding: 32, textAlign: 'center' }}>Staging is empty. Create a drillhole or import a file.</p>}
        </div>
        <div className="sa-tablecard__foot">Holes with errors stay in preparation until fixed; the others can be sent on their own.</div>
      </section>

      {editing && (
        <div className="sa-backdrop tw-backdrop" style={{ alignItems: 'flex-start' }}>
          <div role="dialog" aria-modal="true" aria-label="Drillhole form" style={{ width: '100%', maxWidth: 1320 }}>
            <HoleForm hole={editing.hole} onChange={(h) => setEditing({ ...editing, hole: h })} issues={editing.issues}
              context="staging" savedStatus="Preparation" isSupervisor={me.isSupervisor} dirty={dirty} busy={busy} inModal
              onSave={saveDraft} onClose={closeForm} />
          </div>
        </div>
      )}
      {dialog === 'gtn' && <GtnImportDialog onClose={() => setDialog(null)} onDone={() => load()} />}
      {dialog === 'prefill' && <PrefillDialog onClose={() => setDialog(null)} />}
      {report && <ImportReportDialog summary={report} onClose={() => setReport(null)} />}
      {sendResult && <SendResultDialog results={sendResult} onClose={async () => {
        const imported = sendResult.filter((r) => r.outcome === 'Imported').length;
        setSendResult(null);
        setNotice({ kind: 'success', text: `${imported} ${imported === 1 ? 'hole' : 'holes'} now in acQuire. Find them on the Edit program page.` });
        await load();
      }} />}
    </>
  );
}
