import { useCallback, useState } from 'react';
import { APP_VERSION } from '../../appInfo';
import { Icon, Modal } from '../ui';
import type { Page } from './Sidebar';

const HELP: Record<Page, { title: string; points: readonly string[] }> = {
  edit: {
    title: 'Edit program',
    points: [
      'Pick a hole in the list on the left to open it.',
      'Change the fields and press Save. Errors are shown in red and must be fixed first; warnings are amber.',
      'If someone else saved the same hole in the meantime, you choose whose version to keep.',
      'Validate for drilling moves a hole to PROGRAM_VALIDATED once it has no errors.',
    ],
  },
  import: {
    title: 'Import program',
    points: [
      'Drafts are holes waiting to be sent to acQuire.',
      'Add drafts one by one or from the Excel template.',
      'Tick the drafts without errors and press Send.',
      'A draft whose HOLEID already exists in acQuire opens the conflict dialog.',
    ],
  },
};

export function HelpButton({ page }: { page: Page }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const help = HELP[page];

  return (
    <>
      <button type="button" className="sa-btn sa-btn--icon tw-help" aria-label="Help" title="Help" onClick={() => setOpen(true)}>
        <Icon name="help" />
      </button>
      {open && (
        <Modal title={`Help: ${help.title}`} onClose={close} width={520}>
          <ul className="tw-help__list">
            {help.points.map((p) => <li key={p}>{p}</li>)}
          </ul>
          <p className="caption sa-muted">Techno Wells v{APP_VERSION}</p>
        </Modal>
      )}
    </>
  );
}
