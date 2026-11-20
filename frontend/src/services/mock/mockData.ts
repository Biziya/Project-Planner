// Sample data for mock mode, taken from the old backend's in-memory sample (InMemoryRepositories.cs).
import type { Hole, HoleStatus, LookupItem } from '../../api/api';

export interface AcquireRecord { hole: Hole; version: number }

/** Everything the mock API keeps in memory. A fresh store per test keeps tests independent. */
export interface MockStore {
  acquire: Map<string, AcquireRecord>;
  staging: Map<string, Hole>;
  lookups: Record<string, LookupItem[]>;
  nextId: number;
}

const item = (code: string, description: string, parent: string | null = null): LookupItem => ({ code, description, parent });

export const MOCK_LOOKUPS: Record<string, LookupItem[]> = {
  L01: [item('ZOOVCH', 'Zoovch'), item('DULAAN UUL', 'Dulaan Uul')],
  L02: [item('ZOOVCH-2026', 'Zoovch 2026', 'ZOOVCH'), item('ZOOVCH-2027', 'Zoovch 2027', 'ZOOVCH'), item('DULAAN UUL-2026', 'Dulaan Uul 2026', 'DULAAN UUL')],
  L03: [item('10860X', '10860X'), item('12345A', '12345A')],
  L04: [item('PROJECT', 'Project'), item('PROGRAM_TOVALIDATE', 'Program to validate'), item('PROGRAM_VALIDATED', 'Program validated'), item('FAILED', 'Failed')],
  L05: [item('UTM_Z49N_Planned', 'UTM zone 49N, planned'), item('UTM_Z50N_Planned', 'UTM zone 50N, planned')],
  L06: [item('Hydro', 'Hydro'), item('Techno', 'Techno'), item('Hybrid', 'Hybrid')],
  L07: [item('PRODUCER', 'Producer (P)', 'Techno'), item('INJECTOR', 'Injector (I)', 'Techno'), item('UNIVERSAL', 'Universal (U)', 'Techno'), item('MONITORING', 'Monitoring (M)', 'Hydro')],
  L08: [item('K2Ss2-U1', 'K2Ss2-U1'), item('K2Ss2-U2', 'K2Ss2-U2')],
  L09: [item('RC', 'Reverse circulation'), item('RT', 'Rotary'), item('DC', 'Diamond core')],
  L10: [item('BATAA', 'Bataa (chief geologist)')],
  L11: [item('SARNAI', 'Sarnai')],
  L12: [item('GANBOLD', 'Ganbold')],
  L13: [item('BL38_AIDD', 'BL38 AIDD')],
  L14: [item('AIDD', 'AIDD'), item('GANDRILLING', 'Gan Drilling')],
  L15: [item('Clay', 'Clay'), item('Silt', 'Silt'), item('Sand', 'Sand'), item('Gravel', 'Gravel')],
  L16: [item('Yes', 'Yes'), item('No', 'No')],
};

/** HOLEID parts: PZO_446_055_44_A_ → prefix PZO, easting 446, northing 055, depth bin 44_A, bis _. */
export const holeIdParts = (holeId: string): Pick<Hole, 'holePrefix' | 'eastingColumnHexa' | 'northingRowHexa' | 'depthBin' | 'bisNumber'> => ({
  holePrefix: holeId.slice(0, 3),
  eastingColumnHexa: holeId.slice(4, 7),
  northingRowHexa: holeId.slice(8, 11),
  depthBin: holeId.slice(12, 16),
  bisNumber: holeId.slice(16),
});

const acquireHole = (holeId: string, status: HoleStatus, x: number, y: number, z: number, subPurpose: string, key: string): Hole => ({
  holeId, status, projectCode: 'ZOOVCH', prospect: 'ZOOVCH-2026', tenementId: '10860X', technoWellKey: key,
  x, y, z, coordinateSet: 'UTM_Z49N_Planned', azimuth: 0, dip: -90, holePurpose: 'Techno', subPurpose,
  holePlanTarget: 'K2Ss2-U1', planDrillType: 'RC', holePlanDepth: 260, source: 'acquire', ...holeIdParts(holeId),
  intervals: [
    { type: 'Destructive', from: 0, to: 210, recovery: null, comment: null },
    { type: 'Core', from: 210, to: 240, recovery: 90, comment: 'Target sand' },
    { type: 'Destructive', from: 240, to: 260, recovery: null, comment: null },
  ],
  screenTop: 214, screenBottom: 238,
  gtn: [
    { from: 0, to: 120, lithology: 'Clay', caCO3Risk: 'No' },
    { from: 120, to: 205, lithology: 'Silt', caCO3Risk: 'No' },
    { from: 205, to: 245, lithology: 'Sand', caCO3Risk: 'Yes' },
  ],
});

const draft = (stagingId: string, holeId: string, x: number, y: number, z: number | null, subPurpose: string, key: string): Hole => ({
  stagingId, holeId, status: 'Preparation', source: 'excel', projectCode: 'ZOOVCH', prospect: 'ZOOVCH-2026',
  technoWellKey: key, x, y, z, coordinateSet: 'UTM_Z49N_Planned', azimuth: 0, dip: -90, holePurpose: 'Techno', subPurpose,
  planDrillType: 'RC', holePlanDepth: 260, rowVersion: '1', ...holeIdParts(holeId), intervals: [], gtn: [],
});

export function createMockStore(): MockStore {
  const acquire = new Map<string, AcquireRecord>();
  [
    acquireHole('IZO_446_054_44_A_', 'PROJECT', 612345.2, 4873210.8, 702.4, 'INJECTOR', '1001'),
    acquireHole('IZO_447_054_44_A_', 'PROJECT', 612418.0, 4873210.8, 702.1, 'INJECTOR', '1002'),
    acquireHole('PZO_446_055_44_A_', 'PROGRAM_TOVALIDATE', 612381.6, 4873273.8, 702.9, 'PRODUCER', '1003'),
    acquireHole('IZO_449_055_44_A_', 'PROGRAM_TOVALIDATE', 612600.0, 4873273.8, 703.2, 'INJECTOR', '1004'),
    acquireHole('PZO_448_056_45_A_', 'PROJECT', 612527.2, 4873336.8, 701.7, 'PRODUCER', '1005'),
    acquireHole('IZO_451_057_44_A2', 'PROJECT', 612745.6, 4873399.8, 702.0, 'INJECTOR', '1006'),
    // Not listed (FAILED), but its key and position still count.
    { ...acquireHole('IZO_440_050_44_A_', 'FAILED', 611900.0, 4872958.8, 701.0, 'INJECTOR', '1040'), coordinateSet: 'UTM_Z49N_Surveyed' },
  ].forEach((hole) => acquire.set(hole.holeId, { hole, version: 1 }));

  const staging = new Map<string, Hole>();
  [
    draft('mock-draft-1', 'IZO_453_058_44_A_', 612891.2, 4873462.8, 702.2, 'INJECTOR', '1041'),
    draft('mock-draft-2', 'IZO_454_058_44_A_', 612964.0, 4873462.8, 702.5, 'INJECTOR', '1042'),
    draft('mock-draft-3', 'PZO_455_059_44_A_', 613000.4, 4873525.8, null, 'PRODUCER', '1043'), // Z missing → error
    draft('mock-draft-4', 'IZO_449_055_44_A_', 612601.5, 4873273.8, 703.1, 'INJECTOR', '1004'), // already in acQuire → conflict on send
  ].forEach((hole) => staging.set(hole.stagingId ?? hole.holeId, hole));

  return { acquire, staging, lookups: MOCK_LOOKUPS, nextId: 5 };
}
