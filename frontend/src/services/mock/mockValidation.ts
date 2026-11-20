// A small version of the server's checks, so mock mode shows realistic errors. The real rules live in the backend.
import type { Hole, Issue } from '../../api/api';
import { ALL_FIELDS, MANDATORY } from '../../api/fields';
import type { MockStore } from './mockData';

const HOLE_ID_PATTERN = /^[PIUM][A-Z]{2}_\d{3}_\d{3}_\d{2}_[A-Z](_|[2-5])$/;

/** Issue field names come from the server in PascalCase (HoleId); fields.ts issueKey() turns them back. */
const serverFieldName = (key: string) => key.charAt(0).toUpperCase() + key.slice(1);
const labelOf = (key: keyof Hole) => ALL_FIELDS.find((f) => f.key === key)?.label ?? String(key);

const isEmpty = (value: unknown) => value === null || value === undefined || value === '';

export function validateHole(hole: Hole, store: MockStore): Issue[] {
  const issues: Issue[] = [];
  const add = (field: keyof Hole, rule: string, message: string) =>
    issues.push({ holeId: hole.holeId, row: null, field: serverFieldName(field), rule, level: 'Error', message });

  for (const key of MANDATORY) {
    if (isEmpty(hole[key])) add(key, 'V-01', `${labelOf(key)} is required.`);
  }

  if (hole.holeId && !HOLE_ID_PATTERN.test(hole.holeId)) {
    add('holeId', 'V-02', 'HOLEID does not follow the naming pattern, e.g. IZO_446_054_44_A_.');
  }

  const key = hole.technoWellKey;
  if (!isEmpty(key)) {
    if (!/^\d+$/.test(String(key))) {
      add('technoWellKey', 'V-07', 'TechnoWell key must be a whole number.');
    } else {
      const others = [...[...store.acquire.values()].map((r) => r.hole), ...store.staging.values()]
        .filter((h) => h.holeId !== hole.holeId);
      if (others.some((h) => h.technoWellKey === key)) {
        add('technoWellKey', 'V-08', `TechnoWell key ${key} is already used by another hole.`);
      }
    }
  }

  return issues;
}

export const errorCount = (issues: Issue[]) => issues.filter((i) => i.level === 'Error').length;
export const warningCount = (issues: Issue[]) => issues.filter((i) => i.level === 'Warning').length;
