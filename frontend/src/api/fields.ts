import type { Hole } from './api';

export type FieldKind = 'text' | 'number' | 'date' | 'lookup' | 'auto' | 'status';

export interface FieldDef {
  key: keyof Hole;
  label: string;
  kind: FieldKind;
  lookup?: string;          // L01…L16 (spec 5.4)
  parent?: keyof Hole;      // cascading list (campaign by project, sub purpose by purpose)
  unit?: string;
  mono?: boolean;
  digits?: boolean;          // whole number typed as text (numeric keyboard)
  lockedInAcquire?: boolean;
}

export interface SectionDef { title: string; tone: 'blue' | 'horizon' | 'sand'; wide?: boolean; fields: FieldDef[] }

/** Mandatory fields (V-01). Keep in line with Validation:MandatoryFields in appsettings.json. */
export const MANDATORY = new Set<keyof Hole>([
  'holeId', 'projectCode', 'prospect', 'technoWellKey', 'x', 'y', 'z', 'coordinateSet', 'holePurpose', 'subPurpose', 'planDrillType', 'holePlanDepth'
]);

/** General tab, same sections as the current Program Importer Techno (spec 4.4). */
export const GENERAL_SECTIONS: SectionDef[] = [
  {
    title: 'Drillhole header', tone: 'blue', fields: [
      { key: 'holeId', label: 'HOLEID', kind: 'text', mono: true, lockedInAcquire: true },
      { key: 'bisNumber', label: 'Bis number (auto)', kind: 'auto' },
      { key: 'projectCode', label: 'Project', kind: 'lookup', lookup: 'L01', lockedInAcquire: true },
      { key: 'prospect', label: 'Campaign', kind: 'lookup', lookup: 'L02', parent: 'projectCode' },
      { key: 'tenementId', label: 'Tenement', kind: 'lookup', lookup: 'L03' },
      { key: 'status', label: 'Status', kind: 'status' },
      { key: 'depthBin', label: 'DepthBin (auto)', kind: 'auto' },
      { key: 'technoWellKey', label: 'KEY', kind: 'text', digits: true, mono: true },
    ]
  },
  {
    title: 'Planned coordinates and direction', tone: 'horizon', fields: [
      { key: 'x', label: 'X', kind: 'number', unit: 'm', mono: true },
      { key: 'y', label: 'Y', kind: 'number', unit: 'm', mono: true },
      { key: 'z', label: 'Z', kind: 'number', unit: 'm', mono: true },
      { key: 'coordinateSet', label: 'Coordinate system', kind: 'lookup', lookup: 'L05', lockedInAcquire: true },
      { key: 'azimuth', label: 'Azimuth', kind: 'number', unit: '°' },
      { key: 'dip', label: 'Dip (from vertical)', kind: 'number', unit: '°' },
    ]
  },
  {
    title: 'Picket details', tone: 'sand', wide: true, fields: [
      { key: 'holePurpose', label: 'Purpose', kind: 'lookup', lookup: 'L06' },
      { key: 'subPurpose', label: 'Sub purpose', kind: 'lookup', lookup: 'L07', parent: 'holePurpose' },
      { key: 'holePlanTarget', label: 'Target', kind: 'lookup', lookup: 'L08' },
      { key: 'holePlanDate', label: 'Start date', kind: 'date' },
      { key: 'planDrillType', label: 'Planned drill type', kind: 'lookup', lookup: 'L09' },
      { key: 'holePlanDepth', label: 'Planned depth', kind: 'number', unit: 'm' },
      { key: 'maxDeviation', label: 'Max deviation', kind: 'number' },
      { key: 'chiefGeologist', label: 'Supervisor (chief geologist)', kind: 'lookup', lookup: 'L10' },
      { key: 'technicGeologist', label: 'Technic geologist', kind: 'lookup', lookup: 'L11' },
      { key: 'drillMaster', label: 'Drill master', kind: 'lookup', lookup: 'L12' },
      { key: 'drillRig', label: 'Drill rig', kind: 'lookup', lookup: 'L13' },
      { key: 'drillCompany', label: 'Drill company', kind: 'lookup', lookup: 'L14' },
    ]
  }
];

export const CONSTRUCTION_FIELDS: FieldDef[] = [
  { key: 'mudPlugFrom', label: 'Mud plug top', kind: 'number', unit: 'm' },
  { key: 'mudPlugTo', label: 'Mud plug bottom', kind: 'number', unit: 'm' },
  { key: 'screenTop', label: 'Screen top', kind: 'number', unit: 'm' },
  { key: 'screenBottom', label: 'Screen bottom', kind: 'number', unit: 'm' },
];

export const COMMENT_FIELDS: FieldDef[] = [
  { key: 'planComments', label: 'General comment', kind: 'text' },
  { key: 'planStartComment', label: 'Drilling start comment', kind: 'text' },
  { key: 'planStopComment', label: 'Drilling stop comment', kind: 'text' },
];

/** Every field, for the conflict comparison table. */
export const ALL_FIELDS: FieldDef[] = [
  ...GENERAL_SECTIONS.flatMap((s) => s.fields), ...CONSTRUCTION_FIELDS, ...COMMENT_FIELDS,
  { key: 'failureComment', label: 'Failure comment', kind: 'text' },
];

/** Backend issues use PascalCase property names (Z, HoleId…). */
export const issueKey = (field: string) => field.charAt(0).toLowerCase() + field.slice(1);
