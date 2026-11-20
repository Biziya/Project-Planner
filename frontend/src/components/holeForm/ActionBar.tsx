import type { HoleStatus } from '../../api/api';
import { Icon } from '../Icon';
import { useSheetsLook } from '../sheets';
import { ActionButton } from './ActionButton';

interface ActionBarProps {
  context: 'staging' | 'acquire';
  savedStatus: HoleStatus;
  readOnly: boolean;
  emptyCount: number;
  isSupervisor: boolean;
  dirty: boolean;
  busy?: boolean;
  saveLabel?: string;
  onSave: () => void;
  onValidate?: () => void;
  onRollback?: () => void;
}

/** Form footer, always visible under the scrolling form body. */
export function ActionBar(p: ActionBarProps) {
  const sheets = useSheetsLook();
  const canValidate = p.context === 'acquire' && p.savedStatus === 'PROGRAM_TOVALIDATE' && p.isSupervisor && !p.dirty;
  const validateHint = !p.isSupervisor ? 'Supervisors only' : p.dirty ? 'Save your changes first'
    : p.savedStatus !== 'PROGRAM_TOVALIDATE' ? 'Status must be PROGRAM_TOVALIDATE' : undefined;

  return (
    <footer className={`sa-detail__foot flex-wrap ${sheets ? 'border-gray-200 bg-white' : ''}`}>
      <span className={`caption sa-muted mr-auto ${sheets ? 'min-w-0 flex-1' : ''}`}><span className="text-[color:var(--danger)]">*</span> mandatory · {p.emptyCount} empty
        {p.context === 'acquire' && p.savedStatus === 'PROJECT' ? ' · set Status to PROGRAM_TOVALIDATE and save to validate' : ''}</span>
      {p.savedStatus === 'PROGRAM_VALIDATED' && p.onRollback && (
        <ActionButton variant="ghost" legacy="sa-btn--tertiary" disabled={p.busy} onClick={p.onRollback}>Roll back to picket</ActionButton>
      )}
      {!p.readOnly && (
        <ActionButton variant={p.context === 'staging' ? 'import' : 'save'} legacy={p.context === 'staging' ? 'sa-btn--primary' : 'sa-btn--secondary'}
          disabled={p.busy} onClick={p.onSave} title={p.context === 'acquire' ? 'Save hole (Ctrl+S)' : undefined}>
          {p.saveLabel ?? (p.context === 'staging' ? 'Save draft' : 'Save hole')}
        </ActionButton>
      )}
      {p.context === 'acquire' && !p.readOnly && p.onValidate && (
        <ActionButton variant="neutral" legacy="sa-btn--primary" disabled={!canValidate || p.busy} onClick={p.onValidate} title={validateHint}>
          <Icon name="check" />Validate for drilling
        </ActionButton>
      )}
    </footer>
  );
}
