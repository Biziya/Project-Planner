import { Button } from '../../components/Button';
import { Icon } from '../../components/Icon';
import { HelpButton } from '../../components/layout/HelpButton';

/** Title on the left; New drillhole and Help (far right) on one line. */
export function PageHeader({ onNewHole }: { onNewHole: () => void }) {
  return (
    <div className="sa-pagehead items-center">
      <div className="min-w-0">
        <h1>Edit program</h1>
        <p>Holes in acQuire in PROJECT or PROGRAM_TOVALIDATE. Pick one on the left; its form fills the rest of the page.</p>
      </div>
      <div className="sa-pagehead__actions flex-none">
        <Button variant="primary" onClick={onNewHole}><Icon name="plus" />New drillhole</Button>
        <HelpButton page="edit" />
      </div>
    </div>
  );
}
