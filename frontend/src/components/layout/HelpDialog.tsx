import { APP_VERSION } from '../../appInfo';
import { Modal } from '../ui';
import type { Page } from './Sidebar';

const HELP: Record<Page, { title: string; points: readonly string[] }> = {
  edit: {
    title: 'Edit program',
    points: [
      'Pick a hole in the list on the left to open it.',
      'Change the fields and press Save hole (or Ctrl+S). Errors are shown in red and must be fixed first; warnings are amber.',
      'If someone else saved the same hole in the meantime, you choose whose version to keep.',
      'Validate for drilling moves a saved PROGRAM_TOVALIDATE hole to PROGRAM_VALIDATED once it has no errors (supervisors only).',
    ],
  },
  import: {
    title: 'Import program',
    points: [
      'Drafts are holes waiting to be sent to acQuire.',
      'Add drafts one by one or from the Excel template (Export Excel, then Import Excel).',
      'Tick the drafts without errors and press Send to acQuire.',
      'A draft whose HOLEID already exists in acQuire opens the conflict dialog.',
    ],
  },
};

/** Short help for the current page, opened from the Help (?) button in the page header. */
export function HelpDialog({ page, onClose }: { page: Page; onClose: () => void }) {
  const help = HELP[page];
  return (
    <Modal title={`Help: ${help.title}`} onClose={onClose} width={520}>
      <ul className="tw-help__list">
        {help.points.map((p) => <li key={p}>{p}</li>)}
      </ul>
      <p className="caption sa-muted">Techno Wells v{APP_VERSION}</p>
    </Modal>
  );
}
