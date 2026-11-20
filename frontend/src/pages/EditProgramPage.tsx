import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';
import { api, emptyHole, type Hole, type HoleSummary, type Issue, type Me, type SaveResponse } from '../api/api';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ConflictDialog, GtnImportDialog } from '../components/Dialogs';
import { HoleForm } from '../components/HoleForm';
import { SheetsLook } from '../components/sheets';
import { errorText, toast } from '../components/toast/toast';
import { HoleFilters, NO_FILTERS, type Filters } from './edit/HoleFilters';
import { HoleList } from './edit/HoleList';
import { PageHeader } from './edit/PageHeader';

type Selected = { holeId: string } | null;   // holeId 'new' = a new drillhole not yet imported

/** Runs `go` now, or after the user agrees to drop unsaved changes. Set by the Edit page while it has changes. */
export type LeaveGuard = MutableRefObject<((go: () => void) => void) | null>;

/** "Could not save IZO_446: 3 fields need attention", or the server's own reason. */
function refusedText(what: string, r: SaveResponse) {
  const errors = r.issues.filter((i) => i.level === 'Error').length;
  if (errors > 0) return `${what}: ${errors} ${errors === 1 ? 'field needs' : 'fields need'} attention`;
  return `${what}: ${r.message ?? 'refused by acQuire'}`;
}

export function EditProgramPage({ me, leaveGuard }: { me: Me; leaveGuard?: LeaveGuard }) {
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [holes, setHoles] = useState<HoleSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selected, setSelected] = useState<Selected>(null);
  const [hole, setHole] = useState<Hole | null>(null);
  const [original, setOriginal] = useState('');
  const [savedStatus, setSavedStatus] = useState<Hole['status']>('PROJECT');
  const [issues, setIssues] = useState<Issue[]>([]);
  const [isBusy, setIsBusy] = useState(false);
  const [conflict, setConflict] = useState<{ mine: Hole; theirs: Hole } | null>(null);
  const [isGtnImportOpen, setIsGtnImportOpen] = useState(false);
  const [pendingDiscard, setPendingDiscard] = useState<(() => void) | null>(null);

  const isNew = selected?.holeId === 'new';
  const isDirty = hole !== null && JSON.stringify(hole) !== original;

  /** Runs the action now, or after the user agrees to discard unsaved changes. */
  const guardUnsaved = (action: () => void) => (isDirty ? setPendingDiscard(() => action) : action());

  // Leaving the page with changes: the sidebar links ask through the same dialog; reload / closing the tab gets the browser prompt.
  useEffect(() => {
    if (!isDirty) return;
    if (leaveGuard) leaveGuard.current = (go) => setPendingDiscard(() => go);
    const onBeforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      if (leaveGuard) leaveGuard.current = null;
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [isDirty, leaveGuard]);

  const loadList = useCallback(async () => {
    setIsLoading(true);
    try { setHoles(await api.listHoles(filters)); } catch (e) { toast.error(errorText('Could not load the hole list', e)); } finally { setIsLoading(false); }
  }, [filters]);
  useEffect(() => { const t = setTimeout(loadList, 250); return () => clearTimeout(t); }, [loadList]);

  const showHole = (holeId: string, r: { hole: Hole; issues: Issue[] }) => {
    setSelected({ holeId }); setHole(r.hole); setOriginal(JSON.stringify(r.hole)); setSavedStatus(r.hole.status); setIssues(r.issues);
  };
  const reloadHole = async (holeId: string) => showHole(holeId, await api.getHole(holeId));

  const openHole = (holeId: string) => guardUnsaved(async () => {
    setIsBusy(true);
    try { await reloadHole(holeId); } catch (e) { toast.error(errorText(`Could not open ${holeId}`, e)); } finally { setIsBusy(false); }
  });
  // Open the first hole of the list on load.
  useEffect(() => { const first = holes[0]; if (!selected && first) openHole(first.holeId); }, [holes]); // eslint-disable-line react-hooks/exhaustive-deps

  const startNewHole = () => guardUnsaved(() => {
    const h = { ...emptyHole(), status: 'Preparation' as const };
    setSelected({ holeId: 'new' }); setHole(h); setOriginal(JSON.stringify(h)); setSavedStatus('Preparation'); setIssues([]);
  });

  // Live checks (debounced) while editing.
  const checkTimer = useRef<number>();
  useEffect(() => {
    if (!hole || !isDirty) return;
    window.clearTimeout(checkTimer.current);
    checkTimer.current = window.setTimeout(async () => {
      try { setIssues((await api.validate(hole)).issues); } catch { /* keep previous issues */ }
    }, 600);
  }, [hole, isDirty]);

  const afterSave = async (holeId: string, message: string | null) => {
    if (message) toast.success(message);
    await loadList();
    await reloadHole(holeId);
  };

  /** Saves the form; true when it was saved. */
  const saveHole = async (): Promise<boolean> => {
    if (!hole) return false;
    const id = hole.holeId || 'the new drillhole';
    setIsBusy(true);
    try {
      if (isNew) {
        const r = await api.createDirect(hole);
        setIssues(r.issues);
        if (r.saved) { await afterSave(hole.holeId, `${hole.holeId} imported to acQuire as PROJECT`); return true; }
        toast.error(refusedText(`Could not import ${id}`, r));
        return false;
      }
      const r = await api.saveHole(hole);
      setIssues(r.issues);
      if (r.saved) { await afterSave(hole.holeId, `${hole.holeId} saved`); return true; }
      if (r.inAcquire) setConflict({ mine: r.mine ?? hole, theirs: r.inAcquire });
      else toast.error(refusedText(`Could not save ${id}`, r));
      return false;
    } catch (e) { toast.error(errorText(`Could not save ${id}`, e)); return false; } finally { setIsBusy(false); }
  };

  const keepMine = async () => {
    if (!conflict) return;
    const id = conflict.mine.holeId;
    setIsBusy(true);
    try {
      const r = await api.keepMine(conflict.mine);
      setConflict(null);
      if (r.saved) await afterSave(id, `${id}: your version was saved over acQuire`);
      else { setIssues(r.issues); toast.error(refusedText(`Could not save ${id}`, r)); }
    } catch (e) { toast.error(errorText(`Could not save ${id}`, e)); } finally { setIsBusy(false); }
  };
  const keepTheirs = async () => {
    if (!conflict) return;
    const id = conflict.mine.holeId;
    setConflict(null);
    try { await reloadHole(id); toast.success(`${id}: the acQuire version was kept`); }
    catch (e) { toast.error(errorText(`Could not reload ${id}`, e)); }
  };

  const changeStatus = async (action: 'validate' | 'rollback') => {
    if (!hole) return;
    const id = hole.holeId;
    setIsBusy(true);
    try {
      const r = action === 'validate' ? await api.validateForDrilling(id) : await api.rollback(id);
      if (r.saved) await afterSave(id, action === 'validate' ? `${id} validated for drilling` : `${id} rolled back to PROJECT`);
      else { setIssues(r.issues); toast.error(refusedText(action === 'validate' ? `Could not validate ${id}` : `Could not roll back ${id}`, r)); }
    } catch (e) { toast.error(errorText(action === 'validate' ? `Could not validate ${id}` : `Could not roll back ${id}`, e)); } finally { setIsBusy(false); }
  };

  // Ctrl+S / Cmd+S saves the open hole.
  useEffect(() => {
    if (!hole) return;
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 's') return;
      e.preventDefault();
      if (isDirty && !isBusy && !pendingDiscard && !conflict) void saveHole();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

  // The GTN import dialog shows its own result toast; the open hole is reloaded to show its new GTN rows.
  const onGtnImported = async () => {
    if (hole && !isNew) await reloadHole(hole.holeId);
  };

  return (
    <>
      <SheetsLook.Provider value>
        <PageHeader onNewHole={startNewHole} />

        <div className="flex min-h-split flex-1 gap-4 max-lg:flex-col">
          <aside aria-label="Holes" className="flex w-filter-panel flex-none flex-col overflow-hidden rounded-lg border border-solid border-gray-200 bg-white max-lg:max-h-list-stacked max-lg:w-full">
            <HoleFilters filters={filters} onChange={setFilters} />
            <HoleList holes={holes} isLoading={isLoading} selectedId={selected?.holeId ?? null} onOpen={openHole} />
          </aside>
          {hole ? (
            <HoleForm
              hole={hole} onChange={setHole} issues={issues}
              context={isNew ? 'staging' : 'acquire'}
              savedStatus={savedStatus} isSupervisor={me.isSupervisor} dirty={isDirty} busy={isBusy}
              saveLabel={isNew ? 'Check and import' : undefined}
              onSave={() => void saveHole()}
              onValidate={isNew ? undefined : () => changeStatus('validate')}
              onRollback={() => changeStatus('rollback')}
              onImportGtn={isNew ? undefined : () => setIsGtnImportOpen(true)}
            />
          ) : (
            <section className="sa-split__detail items-center justify-center border-gray-200 p-12 shadow-none">
              <p className="sa-muted m-0">Pick a hole in the list to open its form.</p>
            </section>
          )}
        </div>

        {pendingDiscard && (
          <ConfirmDialog
            title="Discard your changes?"
            description={`Your unsaved edits to ${isNew ? 'the new drillhole' : hole?.holeId ?? 'this hole'} will be lost. This cannot be undone.`}
            confirmLabel="Discard changes"
            destructive
            onConfirm={() => { const action = pendingDiscard; setPendingDiscard(null); action(); }}
            onCancel={() => setPendingDiscard(null)}
          />
        )}
      </SheetsLook.Provider>

      {conflict && <ConflictDialog mine={conflict.mine} theirs={conflict.theirs} onKeepMine={keepMine} onKeepTheirs={keepTheirs} onClose={() => setConflict(null)} />}
      {isGtnImportOpen && <GtnImportDialog onClose={() => setIsGtnImportOpen(false)} onDone={onGtnImported} />}
    </>
  );
}
