import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { APP_VERSION } from '../../appInfo';
import { HelpDialog } from './HelpDialog';

describe('HelpDialog', () => {
  it('shows help for the Edit page, with the version', () => {
    render(<HelpDialog page="edit" onClose={vi.fn()} />);

    const dialog = screen.getByRole('dialog', { name: 'Help: Edit program' });
    expect(dialog).toHaveTextContent('Pick a hole in the list');
    expect(dialog).toHaveTextContent(`v${APP_VERSION}`);
  });

  it('shows help for the Import page', () => {
    render(<HelpDialog page="import" onClose={vi.fn()} />);
    expect(screen.getByRole('dialog', { name: 'Help: Import program' })).toHaveTextContent('Drafts are holes waiting');
  });

  it('closes with the Close button', async () => {
    const onClose = vi.fn();
    render(<HelpDialog page="edit" onClose={onClose} />);
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('closes with Escape', async () => {
    const onClose = vi.fn();
    render(<HelpDialog page="edit" onClose={onClose} />);
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledOnce();
  });
});
