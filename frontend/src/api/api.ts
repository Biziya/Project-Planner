// Types mirror the backend's JSON and the REST API of spec section 9.
import { USE_MOCK } from '../config';
import { mockApi } from '../services/mock/mockApi';
import { httpApi, type Api } from './httpApi';

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
export interface Health { status: string; database: string }
export interface KeySuggestion { suggested: number; maxInAcquire: number | null; maxInStaging: number | null; acquireIncluded: boolean }

export { ApiError } from './apiError';
export type { Api } from './httpApi';

/**
 * The API the app uses. With VITE_USE_MOCK=true (npm run dev) it is the in-memory mock;
 * otherwise it is the real backend. Pages always import `api` from here and never know which one it is.
 */
export const api: Api = USE_MOCK ? mockApi : httpApi;

export const emptyHole = (): Hole => ({
  holeId: '', status: 'Preparation', source: 'form', intervals: [], gtn: [], azimuth: 0, dip: -90
});
