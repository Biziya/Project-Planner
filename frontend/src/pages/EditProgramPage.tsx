import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ApiError, emptyHole, type Hole, type HoleSummary, type Issue, type Me } from '../api/api';
import { HoleForm } from '../components/HoleForm';
import { ConflictDialog, GtnImportDialog } from '../components/Dialogs';
import { Banner, Icon, LookupSelect, StatusChip, confirmDiscard, type Notice } from '../components/ui';

type Selected = { holeId: string } | { holeId: 'new' } | null;

export function EditProgramPage({ me }: { me: Me }) {
  const [filters, setFilters] = useState({ search: '', status: '', purpose: '', target: '' });
  const [list, setList] = useState<HoleSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [listOpen, setListOpen] = useState(true);
  const [selected, setSelected] = useState<Selected>(null);
  const [hole, setHole] = useState<Hole | null>(null);
  const [original, setOriginal] = useState<string>('');
  const [savedStatus, setSavedStatus] = useState<Hole['status']>('PROJECT');
  const [issues, setIssues] = useState<Issue[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [conflict, setConflict] = useState<{ mine: Hole; theirs: Hole } | null>(null);
  const [gtnOpen, setGtnOpen] = useState(false);

  const dirty = hole !== null && JSON.stringify(hole) !== original;
  const fail = (e: unknown) => setNotice({ kind: 'danger', text: e instanceof ApiError ? e.message : 'Something went wrong. Try again.' });

  // ---------------- list
  const loadList = useCallback(async () => {
    setLoading(true);
    try { setList(await api.listHoles(filters)); } catch (e) { fail(e); } finally { setLoading(false); }
  }, [filters]);
  useEffect(() => { const t = setTimeout(loadList, 250); return () => clearTimeout(t); }, [loadList]);

  // ---------------- open a hole
  const open = async (holeId: string) => {
    if (!confirmDiscard(dirty)) return;
    setBusy(true);
    try {
      const r = await api.getHole(holeId);
      setSelected({ holeId });
      setHole(r.hole); setOriginal(JSON.stringify(r.hole)); setSavedStatus(r.hole.status); setIssues(r.issues);
    } catch (e) { fail(e); } finally { setBusy(false); }
  };
  useEffect(() => { if (!selected && list.length) void open(list[0].holeId); /* first hole on load */ }, [list]); // eslint-disable-line react-hooks/exhaustive-deps

  const startNew = () => {
    if (!confirmDiscard(dirty)) return;
    const h = { ...emptyHole(), status: 'Preparation' as const };
    setSelected({ holeId: 'new' }); setHole(h); setOriginal(JSON.stringify(h)); setSavedStatus('Preparation'); setIssues([]);
  };

  // ---------------- live checks (debounced) while editing
  const checkTimer = useRef<number>();
  useEffect(() => {
    if (!hole || !dirty) return;
    window.clearTimeout(checkTimer.current);
    checkTimer.current = window.setTimeout(async () => {
      try { setIssues((await api.validate(hole)).issues); } catch { /* keep previous issues */ }
    }, 600);
  }, [hole, dirty]);

  // ---------------- actions
  const afterSave = async (holeId: string, text: string) => {
    setNotice({ kind: 'success', text });
    await loadList();
    await openFresh(holeId);
  };
  const openFresh = async (holeId: string) => {
    const r = await api.getHole(holeId);
    setSelected({ holeId }); setHole(r.hole); setOriginal(JSON.stringify(r.hole)); setSavedStatus(r.hole.status); setIssues(r.issues);
  };

  const save = async () => {
    if (!hole) return;
    setBusy(true);
    try {
      if (selected?.holeId === 'new') {
        const r = await api.createDirect(hole);
        setIssues(r.issues);
        if (r.saved) await afterSave(hole.holeId, `${hole.holeId} checked and imported to acQuire with status PROJECT.`);
        else setNotice({ kind: 'danger', text: r.message ?? 'The hole was not imported.' });
        return;
      }
      const r = await api.saveHole(hole);
      setIssues(r.issues);
      if (r.saved) await afterSave(hole.holeId, `${hole.holeId} saved to acQuire.`);
      else if (r.inAcquire) setConflict({ mine: r.mine ?? hole, theirs: r.inAcquire });
      else setNotice({ kind: 'danger', text: r.message ?? 'The hole was not saved.' });
    } catch (e) { fail(e); } finally { setBusy(false); }
  };

  const keepMine = async () => {
    if (!conflict) return;
    setBusy(true);
    try {
      const r = await api.keepMine(conflict.mine);
      setConflict(null);
      if (r.saved) await afterSave(conflict.mine.holeId, `${conflict.mine.holeId}: your version was saved over acQuire.`);
      else { setIssues(r.issues); setNotice({ kind: 'danger', text: r.message ?? 'Not saved.' }); }
    } catch (e) { fail(e); } finally { setBusy(false); }
  };
  const keepTheirs = async () => {
    if (!conflict) return;
    const id = conflict.mine.holeId;
    setConflict(null);
    await openFresh(id);
    setNotice({ kind: 'success', text: `${id}: the acQuire version was kept; the form shows it again.` });
  };

  const changeStatus = async (action: 'validate' | 'rollback') => {
    if (!hole) return;
    setBusy(true);
    try {
      const r = action === 'validate' ? await api.validateForDrilling(hole.holeId) : await api.rollback(hole.holeId);
      if (r.saved) await afterSave(hole.holeId, action === 'validate'
        ? `${hole.holeId} validated for drilling: status is now PROGRAM_VALIDATED.`
        : `${hole.holeId} rolled back to picket: status is now PROJECT.`);
      else { setIssues(r.issues); setNotice({ kind: 'danger', text: r.message ?? 'Not changed.' }); }
    } catch (e) { fail(e); } finally { setBusy(false); }
  };

  const setFilter = (k: keyof typeof filters, v: string) => setFilters((f) => ({ ...f, [k]: v }));

  return (
    <>
      <div className="sa-pagehead" style={{ flexWrap: 'wrap' }}>
        <div>
          <span className="overline sa-muted">Program</span>
          <h1>Edit program</h1>
          <p>Holes in acQuire in PROJECT or PROGRAM_TOVALIDATE. Pick one on the left; its form fills the rest of the page.</p>
        </div>
        <div className="sa-pagehead__actions">
          <button className="sa-btn sa-btn--secondary" aria-expanded={listOpen} onClick={() => setListOpen(!listOpen)}>{listOpen ? 'Hide list' : 'Show list'}</button>
          <button className="sa-btn sa-btn--primary" onClick={startNew}><Icon name="plus" />New drillhole</button>
        </div>
      </div>

      <Banner notice={notice} onClose={() => setNotice(null)} />

      <div className="sa-split tw-split">
        {listOpen && (
          <div className="sa-split__list" style={{ width: 'var(--size-filter-panel)', gap: 12 }}>
            <div className="sa-filterbar tw-filtercol" role="search">
              <label className="sa-field"><span className="sa-field__label">Search HOLEID</span>
                <span className="sa-input"><Icon name="search" /><input type="search" placeholder="e.g. PZO_448" value={filters.search}
                  onChange={(e) => setFilter('search', e.target.value)} style={{ fontFamily: 'var(--font-mono)' }} /></span></label>
              <label className="sa-field"><span className="sa-field__label">Status</span>
                <span className="sa-input"><select value={filters.status} onChange={(e) => setFilter('status', e.target.value)}>
                  <option value="">All</option><option>PROJECT</option><option>PROGRAM_TOVALIDATE</option></select></span></label>
              <label className="sa-field"><span className="sa-field__label">Purpose</span>
                <LookupSelect id="L06" label="Purpose" value={filters.purpose || null} onChange={(v) => setFilter('purpose', v ?? '')} /></label>
              <label className="sa-field"><span className="sa-field__label">Target</span>
                <LookupSelect id="L08" label="Target" value={filters.target || null} onChange={(v) => setFilter('target', v ?? '')} /></label>
              <button className="sa-btn sa-btn--tertiary sa-btn--sm" style={{ alignSelf: 'flex-start' }}
                onClick={() => setFilters({ search: '', status: '', purpose: '', target: '' })}>Clear filters</button>
            </div>
            <section className="sa-tablecard" style={{ flex: 1 }}>
              <div className="sa-tablecard__head"><span className="sa-tablecard__count" style={{ margin: 0 }}>{loading ? 'Loading…' : `${list.length} holes`}</span></div>
              <div className="sa-tablewrap">
                <table className="sa-table">
                  <thead><tr><th className="is-sorted">HOLEID <span className="sort">↑</span></th><th>Status</th></tr></thead>
                  <tbody>
                    {list.map((h) => (
                      <tr key={h.holeId} className={selected?.holeId === h.holeId ? 'is-open' : ''}>
                        <td className="id"><button className="sa-idlink" aria-current={selected?.holeId === h.holeId} onClick={() => open(h.holeId)}>{h.holeId}</button></td>
                        <td><StatusChip status={h.status} short /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!loading && list.length === 0 && <p className="sa-muted" style={{ margin: 0, padding: 24, textAlign: 'center' }}>No hole matches these filters. Clear filters to see them all.</p>}
              </div>
            </section>
          </div>
        )}
        <div className="tw-formslot">
          {hole ? (
            <HoleForm
              hole={hole} onChange={setHole} issues={issues}
              context={selected?.holeId === 'new' ? 'staging' : 'acquire'}
              savedStatus={savedStatus} isSupervisor={me.isSupervisor} dirty={dirty} busy={busy}
              saveLabel={selected?.holeId === 'new' ? 'Check and import' : undefined}
              onSave={save}
              onValidate={() => changeStatus('validate')}
              onRollback={() => changeStatus('rollback')}
              onImportGtn={selected?.holeId === 'new' ? undefined : () => setGtnOpen(true)}
            />
          ) : (
            <div className="sa-split__detail" style={{ alignItems: 'center', justifyContent: 'center', padding: 48 }}>
              <p className="sa-muted" style={{ margin: 0 }}>Pick a hole in the list to open its form.</p>
            </div>
          )}
        </div>
      </div>

      {conflict && <ConflictDialog mine={conflict.mine} theirs={conflict.theirs} onKeepMine={keepMine} onKeepTheirs={keepTheirs} onClose={() => setConflict(null)} />}
      {gtnOpen && <GtnImportDialog onClose={() => setGtnOpen(false)} onDone={async (s) => {
        setNotice({ kind: s.issues.some((i) => i.level === 'error') ? 'warning' : 'success', text: `GTN import: ${s.holesWritten} holes updated.` });
        if (hole && selected?.holeId !== 'new') await openFresh(hole.holeId);
      }} />}
    </>
  );
}
