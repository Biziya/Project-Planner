import { describe, expect, it } from 'vitest';
import { createMockApi } from './mockApi';
import { createMockStore } from './mockData';

const freshApi = () => createMockApi(createMockStore(), 0);

describe('mock API', () => {
  it('reports itself healthy, so the sidebar shows Online', async () => {
    await expect(freshApi().health()).resolves.toEqual({ status: 'ok', database: 'mock' });
  });

  it('lists the sample holes, without FAILED ones', async () => {
    const holes = await freshApi().listHoles({});

    expect(holes.map((h) => h.holeId)).toContain('PZO_446_055_44_A_');
    expect(holes.some((h) => h.status === 'FAILED')).toBe(false);
  });

  it('filters the hole list by status', async () => {
    const holes = await freshApi().listHoles({ status: 'PROGRAM_TOVALIDATE' });

    expect(holes.map((h) => h.holeId)).toEqual(['IZO_449_055_44_A_', 'PZO_446_055_44_A_']);
  });

  it('reports a missing mandatory field when a draft is saved', async () => {
    const api = freshApi();
    const [draft] = await api.listStaging();
    if (!draft) throw new Error('sample drafts missing');

    const result = await api.saveStaging({ ...draft.hole, z: null });

    expect(result.errorCount).toBeGreaterThan(0);
    expect(result.issues).toContainEqual(expect.objectContaining({ field: 'Z', rule: 'V-01', level: 'Error' }));
  });

  it('sends a valid draft and reports a conflict for a hole already in acQuire', async () => {
    const api = freshApi();

    const results = await api.send(['mock-draft-1', 'mock-draft-4']);

    expect(results.map((r) => r.outcome)).toEqual(['Imported', 'Conflict']);
    expect((await api.getHole('IZO_453_058_44_A_')).hole.status).toBe('PROJECT');
    expect((await api.listStaging()).map((s) => s.hole.stagingId)).not.toContain('mock-draft-1');
  });

  it('refuses a save when the hole changed in the meantime', async () => {
    const api = freshApi();
    const { hole } = await api.getHole('IZO_446_054_44_A_');
    await api.saveHole({ ...hole, planComments: 'first edit' });

    const second = await api.saveHole({ ...hole, planComments: 'stale edit' });

    expect(second.saved).toBe(false);
    expect(second.inAcquire?.planComments).toBe('first edit');
  });

  it('explains that Excel import needs the real API', async () => {
    await expect(freshApi().importHoles(new File([], 'holes.xlsx'))).rejects.toThrow(/mock data/);
  });
});
