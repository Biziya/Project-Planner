import { useCallback, useEffect, useRef, useState } from 'react';
import { api, emptyHole, type Hole, type ImportSummary, type Issue, type Me, type SendItem, type StagedHole } from '../api/api';
import { Button } from '../components/Button';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { GtnImportDialog, ImportReportDialog, PrefillDialog, SendResultDialog } from '../components/Dialogs';
import { HoleForm } from '../components/HoleForm';
import { ExportMenu, type ExportItem } from '../components/ExportMenu';
import { HelpButton } from '../components/layout/HelpButton';
import { ID_LINK } from '../components/sheets';
import { errorText, toast } from '../components/toast/toast';
import { Icon } from '../components/ui';

// Send checkbox: white with a grey border, blue fill and white check when ticked, blue ring on keyboard focus.
const SEND_CHECKBOX =
  'm-0 h-4 w-4 cursor-pointer appearance-none rounded-sm border border-solid border-gray-400 bg-white bg-center bg-no-repeat align-middle ' +
  'enabled:hover:border-gray-600 checked:border-gblue checked:bg-gblue checked:bg-check ' +
  'checked:enabled:hover:!border-gblue-hover checked:enabled:hover:!bg-gblue-hover ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gblue/40 focus-visible:ring-offset-1 ' +
  'disabled:cursor-not-allowed disabled:border-gray-300 disabled:bg-gray-100';

type Editing = { hole: Hole; original: string; issues: Issue[] };

/** Errors that block sending. A HOLEID already in acQuire (V-03) is sent anyway and resolved as a conflict (X-05). */
const blocking = (s: StagedHole) => s.issues.filter((i) => i.level === 'Error' && !(i.rule === 'V-03' && i.message.includes('acQuire'))).length;
const existsInAcquire = (s: StagedHole) => s.issues.some((i) => i.rule === 'V-03' && i.message.includes('acQuire'));

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * "3 holes sent to acQuire · 1 not sent · 1 conflict reviewed": a warning with a View action when some were not sent.
 * Conflicts are only counted: the user chose a version for each of them in the result dialog.
 */
function toastSendSummary(results: SendItem[], onView?: () => void) {
  const count = (o: SendItem['outcome'][]) => results.filter((r) => o.includes(r.outcome)).length;
  const imported = count(['Imported']);
  const notSent = count(['NotSent', 'Failed']);
  const conflicts = count(['Conflict']);
  const text = `${plural(imported, 'hole', 'holes')} sent to acQuire${notSent ? ` · ${notSent} not sent` : ''}`
    + `${conflicts ? ` · ${plural(conflicts, 'conflict', 'conflicts')} reviewed` : ''}`;
  if (notSent) toast.warning(text, onView && { action: { label: 'View', onClick: onView } });
  else toast.success(text);
}

type Confirm = { kind: 'discard' } | { kind: 'delete'; row: StagedHole } | null;

export function ImportProgramPage({ me }: { me: Me }) {
  const [rows, setRows] = useState<StagedHole[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<Editing | null>(null);
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState<'gtn' | 'prefill' | null>(null);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [report, setReport] = useState<ImportSummary | null>(null);
  /** Send results in the dialog; `toasted` = the summary toast was already shown (dialog opened from its View action). */
  const [sendResult, setSendResult] = useState<{ items: SendItem[]; toasted: boolean } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.listStaging();
      setRows(r);
      // ready holes are selected by default; holes with errors cannot be sent (B-04)
      setChecked(new Set(r.filter((x) => blocking(x) === 0).map((x) => x.hole.stagingId!)));
    } catch (e) { toast.error(errorText('Could not load the drafts', e)); } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  // ---------------- form pop-up
  const dirty = editing !== null && JSON.stringify(editing.hole) !== editing.original;
  const openForm = (s: StagedHole | null) => {
    const hole = s ? s.hole : emptyHole();
    setEditing({ hole, original: JSON.stringify(hole), issues: s ? s.issues : [] });
  };
  const closeForm = () => (dirty ? setConfirm({ kind: 'discard' }) : setEditing(null));

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
      const id = r.hole.holeId || 'New drillhole';
      if (r.errorCount) toast.warning(`${id} saved in preparation · ${plural(r.errorCount, 'error', 'errors')} to fix before sending`);
      else toast.success(`${id} saved in preparation · ready to send`);
      await load();
    } catch (e) { toast.error(errorText(`Could not save ${editing.hole.holeId || 'the new drillhole'}`, e)); } finally { setBusy(false); }
  };

  const remove = async (s: StagedHole) => {
    try { await api.deleteStaging(s.hole.stagingId!); toast.success(`${s.hole.holeId} deleted`); await load(); }
    catch (e) { toast.error(errorText(`Could not delete ${s.hole.holeId}`, e)); }
  };

  // ---------------- Excel
  const importExcel = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      const r = await api.importHoles(file);
      await load();
      const errors = r.issues.filter((i) => i.level.toLowerCase() === 'error').length;
      const text = `Excel import: ${plural(r.holesWritten, 'hole', 'holes')} added${r.issues.length ? ` · ${plural(r.issues.length, 'message', 'messages')}` : ''}`;
      const view = { action: { label: 'View', onClick: () => setReport(r) } };
      if (errors) toast.warning(text, view); else toast.success(text, r.issues.length ? view : undefined);
    } catch (e) { toast.error(errorText(`Could not import ${file.name}`, e)); }
    finally { setBusy(false); if (fileInput.current) fileInput.current.value = ''; }
  };

  // ---------------- send
  const selectedIds = rows.filter((r) => checked.has(r.hole.stagingId!) && blocking(r) === 0).map((r) => r.hole.stagingId!);
  /** Conflicts open the result dialog to choose a version; otherwise a summary toast (View opens the details). */
  const send = async () => {
    setBusy(true);
    try {
      const items = await api.send(selectedIds);
      if (items.some((r) => r.outcome === 'Conflict')) { setSendResult({ items, toasted: false }); return; }
      toastSendSummary(items, () => setSendResult({ items, toasted: true }));
      await load();
    } catch (e) { toast.error(errorText('Could not send to acQuire', e)); } finally { setBusy(false); }
  };

  const exportItems: ExportItem[] = [
    { label: 'Empty template', hint: 'Column names and lookup lists only', href: api.templateUrl('empty') },
    { label: 'Staging table', hint: 'Your current drafts, to work offline or keep a copy', href: api.stagingExportUrl() },
    { label: 'Pre-filled template…', hint: 'Choose values to repeat on every row', onSelect: () => setDialog('prefill') },
    { label: 'GTN template', hint: 'HOLEID, GTN_FROM, GTN_TO, Lithology, CaCO3 risk', href: api.templateUrl('gtn') },
  ];

  const visible = rows.filter((r) => !search || r.hole.holeId.toUpperCase().includes(search.trim().toUpperCase()));
  const toggle = (id: string) => setChecked((c) => { const n = new Set(c); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const fmt = (v: number | null | undefined) => (v === null || v === undefined ? '—' : v.toLocaleString('en-US', { maximumFractionDigits: 3 }).replace(/,/g, '\u202f'));

  return (
    <>
      <div className="sa-pagehead" style={{ flexWrap: 'wrap' }}>
        <div>
          <h1>Import program</h1>
          <p>Holes in Preparation, not yet in acQuire. Create, import and correct them, then send; they become PROJECT at the first import.</p>
        </div>
        <div className="sa-pagehead__actions" style={{ flexWrap: 'wrap' }}>
          <button className="sa-btn sa-btn--secondary" onClick={() => openForm(null)}><Icon name="plus" />New drillhole</button>
          <Button variant="import" disabled={busy} onClick={() => fileInput.current?.click()}>Import Excel</Button>
          <input ref={fileInput} type="file" accept=".xlsx" className="tw-sr" tabIndex={-1} aria-hidden="true" onChange={(e) => importExcel(e.target.files?.[0])} />
          <ExportMenu items={exportItems} />
          <Button variant="import" onClick={() => setDialog('gtn')}>Import GTN (Excel)</Button>
          <HelpButton page="import" />
        </div>
      </div>

      <section className="sa-tablecard">
        <div className="sa-tablecard__head" style={{ flexWrap: 'wrap' }}>
          <h2 className="sa-tablecard__title" style={{ fontSize: 15, lineHeight: '22px' }}>Holes in preparation</h2>
          <span className="sa-tablecard__count">{loading ? 'Loading…' : `${plural(rows.length, 'hole', 'holes')} · ${selectedIds.length} selected`}</span>
          <label className="sa-input" style={{ width: 240, height: 'var(--size-control-sm)' }}><Icon name="search" />
            <input type="search" aria-label="Search HOLEID" placeholder="Search HOLEID" value={search} onChange={(e) => setSearch(e.target.value)} style={{ fontFamily: 'var(--font-mono)' }} /></label>
          <button className="sa-btn sa-btn--primary" disabled={selectedIds.length === 0 || busy} onClick={send}><Icon name="send" />Send to acQuire ({selectedIds.length})</button>
        </div>
        <div className="sa-tablewrap">
          <table className="sa-table" style={{ minWidth: 900 }}>
            <thead><tr><th style={{ width: '1%' }}>Send</th><th className="is-sorted">HOLEID <span className="sort !text-gblue">↑</span></th><th>Source</th><th>Purpose</th>
              <th className="num">X (m)</th><th className="num">Y (m)</th><th className="num">Z (m)</th><th>Checks</th><th><span className="tw-sr">Actions</span></th></tr></thead>
            <tbody>
              {visible.map((r) => {
                const id = r.hole.stagingId!;
                return (
                  <tr key={id} className={editing?.hole.stagingId === id ? 'is-open' : ''}>
                    <td><input type="checkbox" className={SEND_CHECKBOX} aria-label={`Send ${r.hole.holeId}`} disabled={blocking(r) > 0} checked={checked.has(id) && blocking(r) === 0} onChange={() => toggle(id)} /></td>
                    <td className="id"><button className={ID_LINK} onClick={() => openForm(r)}>{r.hole.holeId || '(no HOLEID)'}</button></td>
                    <td>{r.hole.source === 'excel' ? 'Excel' : 'Form'}</td>
                    <td>{r.hole.holePurpose ?? '—'}</td>
                    <td className="num id">{fmt(r.hole.x)}</td><td className="num id">{fmt(r.hole.y)}</td><td className="num id">{fmt(r.hole.z)}</td>
                    <td>{blocking(r) > 0
                      ? <span className="sa-status sa-status--danger">{blocking(r)} {blocking(r) === 1 ? 'error' : 'errors'}</span>
                      : existsInAcquire(r)
                        ? <span className="sa-status sa-status--warning" title="Sending will ask which version to keep">Exists in acQuire</span>
                        : <span className="sa-status sa-status--success">{r.warningCount ? `Ready · ${r.warningCount} warning${r.warningCount > 1 ? 's' : ''}` : 'Ready'}</span>}</td>
                    <td className="sa-rowaction"><button className="sa-btn sa-btn--icon sa-btn--sm" aria-label={`Delete ${r.hole.holeId}`} title={`Delete ${r.hole.holeId}`} onClick={() => setConfirm({ kind: 'delete', row: r })}><Icon name="trash" /></button></td>
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
      {sendResult && <SendResultDialog results={sendResult.items} onClose={async () => {
        const { items, toasted } = sendResult;
        setSendResult(null);
        if (!toasted) toastSendSummary(items);
        await load();
      }} />}

      {confirm?.kind === 'discard' && (
        <ConfirmDialog title="Discard your changes?"
          description={`Your unsaved edits to ${editing?.hole.holeId || 'the new drillhole'} will be lost. This cannot be undone.`}
          confirmLabel="Discard changes" destructive
          onConfirm={() => { setConfirm(null); setEditing(null); }} onCancel={() => setConfirm(null)} />
      )}
      {confirm?.kind === 'delete' && (
        <ConfirmDialog title={`Delete draft ${confirm.row.hole.holeId || '(no HOLEID)'}?`}
          description="The draft is removed from preparation. This cannot be undone."
          confirmLabel="Delete draft" destructive
          onConfirm={() => { const row = confirm.row; setConfirm(null); void remove(row); }} onCancel={() => setConfirm(null)} />
      )}
    </>
  );
}
