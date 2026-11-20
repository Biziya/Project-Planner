import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { APP_VERSION } from '../../appInfo';
import { HelpButton } from './HelpButton';

describe('HelpButton', () => {
  it('opens help for the Edit page, with the version', async () => {
    render(<HelpButton page="edit" />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Help' }));

    const dialog = screen.getByRole('dialog', { name: 'Help: Edit program' });
    expect(dialog).toHaveTextContent('Pick a hole in the list');
    expect(dialog).toHaveTextContent(`v${APP_VERSION}`);
  });

  it('opens help for the Import page', async () => {
    render(<HelpButton page="import" />);

    await userEvent.click(screen.getByRole('button', { name: 'Help' }));

    expect(screen.getByRole('dialog', { name: 'Help: Import program' })).toHaveTextContent('Drafts are holes waiting');
  });

  it('closes with the Close button', async () => {
    render(<HelpButton page="edit" />);
    await userEvent.click(screen.getByRole('button', { name: 'Help' }));

    await userEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes with Escape', async () => {
    render(<HelpButton page="edit" />);
    await userEvent.click(screen.getByRole('button', { name: 'Help' }));

    await userEvent.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
