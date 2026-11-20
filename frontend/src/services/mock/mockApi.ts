// In-memory stand-in for the backend, used when VITE_USE_MOCK=true. Same functions and result shapes as httpApi.
import type { Hole, HoleSummary, Issue, SaveResponse, SendItem, StagedHole } from '../../api/api';
import { ApiError } from '../../api/apiError';
import type { Api } from '../../api/httpApi';
import { createMockStore, holeIdParts, type MockStore } from './mockData';
import { errorCount, validateHole, warningCount } from './mockValidation';

const NOT_IN_MOCK = 'Not available with mock data. Run the app against the API (npm run dev:api) to use Excel files.';

/** Mock mode has nothing to download; the link keeps the user on the Import page. */
const NO_DOWNLOAD_URL = '#import';

export function createMockApi(store: MockStore = createMockStore(), delayMs = 150): Api {
  const wait = <T>(value: T) => new Promise<T>((resolve) => setTimeout(() => resolve(structuredClone(value)), delayMs));
  const fail = (status: number, message: string) => new Promise<never>((_, reject) => setTimeout(() => reject(new ApiError(status, message, null)), delayMs));

  const withParts = (hole: Hole): Hole => ({ ...hole, ...(hole.holeId ? holeIdParts(hole.holeId) : {}) });
  const staged = (hole: Hole): StagedHole => {
    const issues = validateHole(hole, store);
    return { hole, issues, errorCount: errorCount(issues), warningCount: warningCount(issues) };
  };
  const refused = (issues: Issue[], message: string): SaveResponse => ({ saved: false, issues, message, mine: null, inAcquire: null });
  const saved = (issues: Issue[]): SaveResponse => ({ saved: true, issues, message: null, mine: null, inAcquire: null });
  const forClient = (record: { hole: Hole; version: number }): Hole => ({ ...record.hole, acquireVersion: String(record.version) });

  const writeToAcquire = (hole: Hole) => {
    const current = store.acquire.get(hole.holeId);
    const inAcquire: Hole = { ...hole, source: 'acquire' };
    delete inAcquire.stagingId;
    delete inAcquire.rowVersion;
    store.acquire.set(hole.holeId, { hole: inAcquire, version: (current?.version ?? 0) + 1 });
  };

  const changeStatus = (holeId: string, allowedFrom: Hole['status'][], to: Hole['status'], label: string) => {
    const record = store.acquire.get(holeId);
    if (!record) return fail(404, `Hole ${holeId} was not found.`);
    if (!allowedFrom.includes(record.hole.status)) return wait(refused([], `${label} is not possible from status ${record.hole.status}.`));
    const issues = validateHole(record.hole, store);
    if (to === 'PROGRAM_VALIDATED' && errorCount(issues) > 0) return wait(refused(issues, 'Fix the errors before validating for drilling.'));
    store.acquire.set(holeId, { hole: { ...record.hole, status: to }, version: record.version + 1 });
    return wait(saved(issues));
  };

  return {
    health: () => wait({ status: 'ok', database: 'mock' }),
    me: () => wait({ name: 'mock.user', isSupervisor: true }),

    lookup: (id, parent) => {
      const items = store.lookups[id] ?? [];
      return wait(parent ? items.filter((i) => i.parent === parent) : items);
    },

    suggestKey: () => {
      const keys = (holes: Iterable<Hole>) => [...holes].map((h) => Number(h.technoWellKey)).filter(Number.isFinite);
      const maxInAcquire = Math.max(0, ...keys([...store.acquire.values()].map((r) => r.hole)));
      const maxInStaging = Math.max(0, ...keys(store.staging.values()));
      return wait({ suggested: Math.max(maxInAcquire, maxInStaging) + 1, maxInAcquire, maxInStaging, acquireIncluded: true });
    },

    validate: (hole) => {
      const checked = withParts(hole);
      return wait({ hole: checked, issues: validateHole(checked, store) });
    },

    // ---------------------------------------------------------------- Edit Program
    listHoles: (filters) => {
      const search = filters.search?.trim().toUpperCase() ?? '';
      const list: HoleSummary[] = [...store.acquire.values()]
        .map((r) => r.hole)
        .filter((h) => h.status !== 'FAILED')
        .filter((h) => !search || h.holeId.toUpperCase().includes(search))
        .filter((h) => !filters.status || h.status === filters.status)
        .filter((h) => !filters.purpose || h.holePurpose === filters.purpose)
        .filter((h) => !filters.target || h.holePlanTarget === filters.target)
        .sort((a, b) => a.holeId.localeCompare(b.holeId))
        .map((h) => ({
          holeId: h.holeId, status: h.status, projectCode: h.projectCode ?? null, prospect: h.prospect ?? null,
          holePurpose: h.holePurpose ?? null, holePlanTarget: h.holePlanTarget ?? null,
        }));
      return wait(list);
    },

    getHole: (holeId) => {
      const record = store.acquire.get(holeId);
      return record ? wait({ hole: forClient(record), issues: validateHole(record.hole, store) }) : fail(404, `Hole ${holeId} was not found.`);
    },

    saveHole: (hole) => {
      const record = store.acquire.get(hole.holeId);
      if (!record) return fail(404, `Hole ${hole.holeId} was not found.`);
      const issues = validateHole(hole, store);
      if (errorCount(issues) > 0) return wait(refused(issues, 'Fix the errors before saving.'));
      if (hole.acquireVersion !== String(record.version)) {
        return wait({ saved: false, issues, message: 'Someone else changed this hole while you were editing.', mine: hole, inAcquire: forClient(record) });
      }
      writeToAcquire(withParts(hole));
      return wait(saved(issues));
    },

    keepMine: (hole) => {
      if (!store.acquire.has(hole.holeId)) return fail(404, `Hole ${hole.holeId} was not found.`);
      const issues = validateHole(hole, store);
      if (errorCount(issues) > 0) return wait(refused(issues, 'Fix the errors before saving.'));
      writeToAcquire(withParts(hole));
      return wait(saved(issues));
    },

    createDirect: (hole) => {
      const issues = validateHole(hole, store);
      if (store.acquire.has(hole.holeId)) return wait(refused(issues, `${hole.holeId} already exists in acQuire.`));
      if (errorCount(issues) > 0) return wait(refused(issues, 'Fix the errors before importing.'));
      writeToAcquire({ ...withParts(hole), status: 'PROJECT' });
      return wait(saved(issues));
    },

    validateForDrilling: (holeId) => changeStatus(holeId, ['PROGRAM_TOVALIDATE'], 'PROGRAM_VALIDATED', 'Validation for drilling'),
    rollback: (holeId) => changeStatus(holeId, ['PROGRAM_TOVALIDATE', 'PROGRAM_VALIDATED'], 'PROJECT', 'Rollback'),

    // ---------------------------------------------------------------- Import Program
    listStaging: () => wait([...store.staging.values()].map(staged)),

    createStaging: (hole) => {
      const stagingId = `mock-draft-${store.nextId++}`;
      const created: Hole = { ...withParts(hole), stagingId, status: 'Preparation', source: 'form', rowVersion: '1' };
      store.staging.set(stagingId, created);
      return wait(staged(created));
    },

    saveStaging: (hole) => {
      const id = hole.stagingId;
      if (!id || !store.staging.has(id)) return fail(404, 'This draft no longer exists.');
      const updated: Hole = { ...withParts(hole), rowVersion: String(Number(hole.rowVersion ?? '0') + 1) };
      store.staging.set(id, updated);
      return wait(staged(updated));
    },

    deleteStaging: (id) => (store.staging.delete(id) ? wait(null) : fail(404, 'This draft no longer exists.')),

    send: (stagingIds) => {
      const results: SendItem[] = stagingIds.map((stagingId) => {
        const hole = store.staging.get(stagingId);
        if (!hole) return { stagingId, holeId: '', outcome: 'Failed', message: 'This draft no longer exists.', issues: [], mine: null, inAcquire: null };
        const issues = validateHole(hole, store);
        if (errorCount(issues) > 0) return { stagingId, holeId: hole.holeId, outcome: 'NotSent', message: 'Fix the errors first.', issues, mine: null, inAcquire: null };
        const existing = store.acquire.get(hole.holeId);
        if (existing) return { stagingId, holeId: hole.holeId, outcome: 'Conflict', message: `${hole.holeId} already exists in acQuire.`, issues, mine: hole, inAcquire: forClient(existing) };
        writeToAcquire({ ...hole, status: 'PROJECT' });
        store.staging.delete(stagingId);
        return { stagingId, holeId: hole.holeId, outcome: 'Imported', message: null, issues, mine: null, inAcquire: null };
      });
      return wait(results);
    },

    resolve: (stagingId, keep) => {
      const hole = store.staging.get(stagingId);
      if (!hole) return fail(404, 'This draft no longer exists.');
      if (keep === 'mine') writeToAcquire({ ...hole, status: store.acquire.get(hole.holeId)?.hole.status ?? 'PROJECT' });
      store.staging.delete(stagingId);
      return wait(null);
    },

    importHoles: () => fail(501, NOT_IN_MOCK),
    importGtn: () => fail(501, NOT_IN_MOCK),
    templateUrl: () => NO_DOWNLOAD_URL,
    stagingExportUrl: () => NO_DOWNLOAD_URL,
  };
}

/** The shared mock used by the running app (data resets on page reload). */
export const mockApi: Api = createMockApi();
