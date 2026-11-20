// The real API client: talks to the TechnoWells backend over HTTP.
import type { Hole, HoleSummary, ImportSummary, Issue, KeySuggestion, LookupItem, Me, SaveResponse, SendItem, StagedHole } from './api';
import { ApiError } from './apiError';

/** API base URL: VITE_API_BASE_URL in .env (e.g. https://api.example.local/api), otherwise same server (/api). */
export const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');

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

export const httpApi = {
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
  deleteStaging: (id: string) => call<null>('DELETE', `/staging/holes/${id}`),
  send: (stagingIds: string[]) => call<SendItem[]>('POST', '/send', { stagingIds }),
  resolve: (stagingId: string, keep: 'mine' | 'acquire') => call<null>('POST', '/send/resolve', { stagingId, keep }),
  importHoles: (file: File) => { const f = new FormData(); f.append('file', file); return call<ImportSummary>('POST', '/imports/holes', f); },
  importGtn: (file: File, mode: 'replace' | 'add') => { const f = new FormData(); f.append('file', file); return call<ImportSummary>('POST', `/imports/gtn?mode=${mode}`, f); },
  templateUrl: (kind: 'empty' | 'gtn' | 'prefilled', values: Record<string, string | number | null | undefined> = {}) => `${API_BASE}/exports/template${q({ kind, ...values })}`,
  stagingExportUrl: () => `${API_BASE}/exports/staging`,
};

/** The shape every API implementation (real or mock) must have. */
export type Api = typeof httpApi;
