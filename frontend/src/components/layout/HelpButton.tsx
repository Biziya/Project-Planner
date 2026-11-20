import { useState } from 'react';
import { IconButton } from '../IconButton';
import { HelpDialog } from './HelpDialog';
import type { Page } from './Sidebar';

/** "?" icon button at the far right of a page header; opens the page's help. */
export function HelpButton({ page }: { page: Page }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <IconButton icon="help" label="Help" onClick={() => setIsOpen(true)} />
      {isOpen && <HelpDialog page={page} onClose={() => setIsOpen(false)} />}
    </>
  );
}
