import { useEffect, useState } from 'react';
import { api, type Hole, type HoleStatus, type Issue, type KeySuggestion } from '../api/api';
import { GENERAL_SECTIONS, MANDATORY, issueKey, type FieldDef } from '../api/fields';
import { ActionBar } from './holeForm/ActionBar';
import { ConstructionTab } from './holeForm/ConstructionTab';
import { FormField } from './holeForm/FormField';
import { FAILURE_COMMENT, GeneralTab } from './holeForm/GeneralTab';
import { GtnTab } from './holeForm/GtnTab';
import { HoleTabs, type Tab } from './holeForm/HoleTabs';
import { useSheetsLook } from './sheets';
import { Icon, StatusChip } from './ui';

interface Props {
  hole: Hole;
  onChange: (hole: Hole) => void;
  issues: Issue[];
  context: 'staging' | 'acquire';
  savedStatus: HoleStatus;            // status as stored (drives buttons)
  isSupervisor: boolean;
  dirty: boolean;
  busy?: boolean;
  inModal?: boolean;
  onSave: () => void;
  onClose?: () => void;
  onValidate?: () => void;
  onRollback?: () => void;
  onImportGtn?: () => void;
  saveLabel?: string;
}

const STATUS_CHOICES: Partial<Record<HoleStatus, HoleStatus[]>> = {
  PROJECT: ['PROJECT', 'PROGRAM_TOVALIDATE', 'FAILED'],
  PROGRAM_TOVALIDATE: ['PROGRAM_TOVALIDATE', 'PROJECT', 'FAILED'],
};

const isEmpty = (v: unknown) => v === null || v === undefined || (typeof v === 'string' && v.trim() === '');

export function HoleForm(p: Props) {
  const sheets = useSheetsLook();
  const [tab, setTab] = useState<Tab>('general');
  const [keyHint, setKeyHint] = useState<KeySuggestion | null>(null);
  // Suggested KEY (highest KEY of all holes + 1): information only, never filled in automatically.
  // Refreshed when the form opens and after each save.
  useEffect(() => {
    if (p.dirty) return;
    let alive = true;
    api.suggestKey().then((k) => alive && setKeyHint(k)).catch(() => alive && setKeyHint(null));
    return () => { alive = false; };
  }, [p.dirty, p.hole.holeId]);

  const { hole } = p;
  const readOnly = p.savedStatus === 'PROGRAM_VALIDATED' || p.savedStatus === 'FAILED';
  const update = (patch: Partial<Hole>) => p.onChange({ ...hole, ...patch });

  const isLocked = (f: FieldDef) => readOnly || f.kind === 'auto' || (p.context === 'acquire' && !!f.lockedInAcquire);
  const isMissing = (f: FieldDef) => MANDATORY.has(f.key) && !isLocked(f) && isEmpty(hole[f.key]);
  const failureMissing = hole.status === 'FAILED' && isEmpty(hole.failureComment);
  const emptyCount = GENERAL_SECTIONS.flatMap((s) => s.fields).filter(isMissing).length + (failureMissing ? 1 : 0);
  const errors = p.issues.filter((i) => i.level === 'Error');
  const warnings = p.issues.filter((i) => i.level === 'Warning');

  const renderField = (f: FieldDef) => {
    const isFailure = f.key === FAILURE_COMMENT.key;
    const locked = isLocked(f);
    return (
      <FormField
        key={f.key}
        field={f}
        value={hole[f.key] as string | number | null | undefined}
        onChange={update}
        required={MANDATORY.has(f.key) || isFailure}
        locked={locked}
        showLock={!readOnly}
        missing={isFailure ? failureMissing : isMissing(f)}
        missingText={isFailure ? 'Explain why the hole is cancelled.' : 'Mandatory: fill it in before sending.'}
        issues={p.issues.filter((i) => issueKey(i.field) === f.key)}
        statusOptions={p.context === 'acquire' && !readOnly ? STATUS_CHOICES[p.savedStatus] : undefined}
        parentValue={f.parent ? (hole[f.parent] as string | null | undefined) ?? null : undefined}
        placeholder={isFailure ? 'Why was this hole cancelled?' : undefined}
        help={f.key === 'technoWellKey' && !locked && keyHint && (
          <span className="sa-field__help" title={`Highest KEY in acQuire (all statuses): ${keyHint.maxInAcquire ?? '—'} · in drafts: ${keyHint.maxInStaging ?? '—'}`}>
            Suggested KEY: <b className="sa-mono">{keyHint.suggested}</b>{keyHint.acquireIncluded ? '' : ' (drafts only: acQuire not connected yet)'}
          </span>
        )}
      />
    );
  };

  const where = p.context === 'staging' ? `Not yet in acQuire${hole.source ? ' · ' + hole.source : ''}` : readOnly ? 'Read only' : 'In acQuire';

  return (
    <article className={p.inModal ? 'sa-modal h-auto w-full max-w-none [&_.sa-detail__body]:overflow-visible'
      : `sa-split__detail h-full ${sheets ? 'border-gray-200 shadow-none max-lg:min-h-split' : ''}`}>
      <div className="sa-detail__head">
        {sheets ? (
          <span className="inline-flex items-center gap-2">
            <span className="font-sans text-sm font-medium text-gray-500">Hole ID:</span>
            <b className="font-mono text-base font-semibold">{hole.holeId || 'New drillhole'}</b>
          </span>
        ) : (
          <>
            <span className="overline sa-muted">Hole</span>
            <b className="font-mono text-base font-semibold">{hole.holeId || 'New drillhole'}</b>
          </>
        )}
        <StatusChip status={p.savedStatus} />
        <span className="caption sa-muted mr-auto">{where}</span>
        {p.onClose && <button className="sa-btn sa-btn--icon sa-btn--sm" aria-label="Close" onClick={p.onClose}><Icon name="close" /></button>}
      </div>

      <HoleTabs tab={tab} onSelect={setTab} />

      <div className={`sa-detail__body ${sheets ? 'bg-white' : ''}`}>
        {(errors.length > 0 || warnings.length > 0) && (
          <div role="alert" className={`sa-note ${errors.length ? 'sa-note--danger' : 'sa-note--warning'}`}>
            <b>{errors.length ? `${errors.length} ${errors.length === 1 ? 'issue' : 'issues'} to fix before sending` : `${warnings.length} ${warnings.length === 1 ? 'warning' : 'warnings'} to check`}</b>
            {[...errors, ...warnings].map((i, n) => <div key={n}>{i.message}</div>)}
          </div>
        )}
        {tab === 'general' && <GeneralTab readOnly={readOnly} failed={hole.status === 'FAILED'} renderField={renderField} />}
        {tab === 'construction' && (
          <ConstructionTab hole={hole} onChange={update} readOnly={readOnly} issues={p.issues.filter((i) => i.field === 'Intervals' || i.field.startsWith('Intervals.'))} renderField={renderField} />
        )}
        {tab === 'gtn' && (
          <GtnTab hole={hole} onChange={update} readOnly={readOnly} issues={p.issues.filter((i) => i.field === 'Gtn' || i.field.startsWith('Gtn.'))} onImport={p.onImportGtn} />
        )}
      </div>

      <ActionBar context={p.context} savedStatus={p.savedStatus} readOnly={readOnly} emptyCount={emptyCount}
        isSupervisor={p.isSupervisor} dirty={p.dirty} busy={p.busy} saveLabel={p.saveLabel}
        onSave={p.onSave} onValidate={p.onValidate} onRollback={p.onRollback} />
    </article>
  );
}
