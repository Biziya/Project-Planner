// Types mirror the backend (TechnoWells.Core.Model) and the REST API of spec section 9.

export type HoleStatus = 'Preparation' | 'PROJECT' | 'PROGRAM_TOVALIDATE' | 'PROGRAM_VALIDATED' | 'FAILED';
export type IntervalType = 'Destructive' | 'Core';

export interface Interval { type: IntervalType; from: number | null; to: number | null; recovery: number | null; comment: string | null }
export interface GtnRow { from: number | null; to: number | null; lithology: string | null; caCO3Risk: string | null }

export interface Hole {
  stagingId?: string | null; source?: string; rowVersion?: string | null; acquireVersion?: string | null;
  holeId: string; bisNumber?: string | null; projectCode?: string | null; prospect?: string | null; tenementId?: string | null;
  status: HoleStatus; failureComment?: string | null; depthBin?: string | null; technoWellKey?: string | null;
  holePrefix?: string | null; eastingColumnHexa?: string | null; northingRowHexa?: string | null;
  x?: number | null; y?: number | null; z?: number | null; coordinateSet?: string | null; azimuth?: number | null; dip?: number | null;
  holePurpose?: string | null; subPurpose?: string | null; holePlanTarget?: string | null; holePlanDate?: string | null;
  planDrillType?: string | null; holePlanDepth?: number | null; maxDeviation?: number | null;
  chiefGeologist?: string | null; technicGeologist?: string | null; drillMaster?: string | null; drillRig?: string | null; drillCompany?: string | null;
  associatedCells?: string | null;
  intervals: Interval[]; mudPlugFrom?: number | null; mudPlugTo?: number | null; screenTop?: number | null; screenBottom?: number | null;
  planComments?: string | null; planStartComment?: string | null; planStopComment?: string | null;
  gtn: GtnRow[];
}

export interface Issue { holeId: string; row: number | null; field: string; rule: string; level: 'Error' | 'Warning'; message: string }
export interface LookupItem { code: string; description: string; parent: string | null }
export interface HoleSummary { holeId: string; status: HoleStatus; projectCode: string | null; prospect: string | null; holePurpose: string | null; holePlanTarget: string | null }
export interface StagedHole { hole: Hole; issues: Issue[]; errorCount: number; warningCount: number }
export interface SaveResponse { saved: boolean; issues: Issue[]; message: string | null; mine: Hole | null; inAcquire: Hole | null }
export interface SendItem { stagingId: string; holeId: string; outcome: 'Imported' | 'NotSent' | 'Conflict' | 'Failed'; message: string | null; issues: Issue[]; mine: Hole | null; inAcquire: Hole | null }
export interface ImportRowIssue { row: number; holeId: string | null; field: string; rule: string; level: string; message: string }
export interface ImportSummary { rowsRead: number; holesWritten: number; issues: ImportRowIssue[] }
export interface Me { name: string; isSupervisor: boolean }
export interface KeySuggestion { suggested: number; maxInAcquire: number | null; maxInStaging: number | null; acquireIncluded: boolean }

/** API base URL: VITE_API_BASE_URL in .env (e.g. https://10.10.10.10:444/api), otherwise same server (/api). */
export const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(public status: number, message: string, public body: unknown) { super(message); }
}

async function call<T>(method: string, url: string, body?: unknown): Promise<T> {
  const init: RequestInit = { method, credentials: 'include', headers: {} };
  if (body instanceof FormData) init.body = body;
  else if (body !== undefined) { init.body = JSON.stringify(body); (init.headers as Record<string, string>)['Content-Type'] = 'application/json'; }
  let res: Response;
  try { res = await fetch(API_BASE + url, init); }
  catch { throw new ApiError(0, 'The server cannot be reached. Check your network and try again.', null); }
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok && res.status !== 409 && res.status !== 422) {
    const msg = (data && (data.message || data.title || data.detail)) || `Request failed (${res.status}).`;
    throw new ApiError(res.status, msg, data);
  }
  if (res.status === 409 || res.status === 422) {
    // Conflict and validation errors carry a normal body (SaveResponse): returned, not thrown.
    if (data && typeof data === 'object' && 'saved' in data) return data as T;
    throw new ApiError(res.status, (data && data.message) || 'The request was refused.', data);
  }
  return data as T;
}

const q = (params: Record<string, string | number | null | undefined>) => {
  const s = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v !== null && v !== undefined && v !== '') s.set(k, String(v)); });
  const t = s.toString();
  return t ? '?' + t : '';
};

export const api = {
  me: () => call<Me>('GET', '/me'),
  lookup: (id: string, parent?: string | null) => call<LookupItem[]>('GET', `/lookups/${id}${q({ parent })}`),
  suggestKey: () => call<KeySuggestion>('GET', '/keys/suggestion'),
  validate: (hole: Hole) => call<{ hole: Hole; issues: Issue[] }>('POST', '/validate', hole),

  // Edit Program
  listHoles: (f: { search?: string; status?: string; purpose?: string; target?: string }) => call<HoleSummary[]>('GET', '/holes' + q(f)),
  getHole: (holeId: string) => call<{ hole: Hole; issues: Issue[] }>('GET', `/holes/${encodeURIComponent(holeId)}`),
  saveHole: (hole: Hole) => call<SaveResponse>('PUT', `/holes/${encodeURIComponent(hole.holeId)}`, hole),
  keepMine: (hole: Hole) => call<SaveResponse>('POST', `/holes/${encodeURIComponent(hole.holeId)}/keep-mine`, hole),
  createDirect: (hole: Hole) => call<SaveResponse>('POST', '/holes', hole),
  validateForDrilling: (holeId: string) => call<SaveResponse>('POST', `/holes/${encodeURIComponent(holeId)}/validate`),
  rollback: (holeId: string) => call<SaveResponse>('POST', `/holes/${encodeURIComponent(holeId)}/rollback`),

  // Import Program
  listStaging: () => call<StagedHole[]>('GET', '/staging/holes'),
  createStaging: (hole: Hole) => call<StagedHole>('POST', '/staging/holes', hole),
  saveStaging: (hole: Hole) => call<StagedHole>('PUT', `/staging/holes/${hole.stagingId}`, hole),
  deleteStaging: (id: string) => call<void>('DELETE', `/staging/holes/${id}`),
  send: (stagingIds: string[]) => call<SendItem[]>('POST', '/send', { stagingIds }),
  resolve: (stagingId: string, keep: 'mine' | 'acquire') => call<void>('POST', '/send/resolve', { stagingId, keep }),
  importHoles: (file: File) => { const f = new FormData(); f.append('file', file); return call<ImportSummary>('POST', '/imports/holes', f); },
  importGtn: (file: File, mode: 'replace' | 'add') => { const f = new FormData(); f.append('file', file); return call<ImportSummary>('POST', `/imports/gtn?mode=${mode}`, f); },
  templateUrl: (kind: 'empty' | 'gtn' | 'prefilled', values: Record<string, string | number | null | undefined> = {}) => `${API_BASE}/exports/template${q({ kind, ...values })}`,
  stagingExportUrl: () => `${API_BASE}/exports/staging`,
};

export const emptyHole = (): Hole => ({
  holeId: '', status: 'Preparation', source: 'form', intervals: [], gtn: [], azimuth: 0, dip: -90
});
