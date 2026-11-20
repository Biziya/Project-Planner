import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmDialog } from './ConfirmDialog';

function Harness({ destructive = true, onConfirm = vi.fn() }: { destructive?: boolean; onConfirm?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Open hole</button>
      {open && (
        <ConfirmDialog title="Discard your changes?" description="Your unsaved edits will be lost." confirmLabel="Discard changes"
          destructive={destructive} onConfirm={() => { onConfirm(); setOpen(false); }} onCancel={() => setOpen(false)} />
      )}
    </>
  );
}

describe('ConfirmDialog', () => {
  it('is a labelled modal dialog with Cancel then a red confirm button named after the action', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'Open hole' }));

    const dialog = screen.getByRole('dialog', { name: 'Discard your changes?' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleDescription('Your unsaved edits will be lost.');
    const [cancel, confirm] = screen.getAllByRole('button').filter((b) => dialog.contains(b));
    expect(cancel).toHaveTextContent('Cancel');
    expect(confirm).toHaveTextContent('Discard changes');
    expect(confirm).toHaveClass('bg-red-600');
  });

  it('moves focus in, keeps Tab inside, and returns focus to the opener on Esc', async () => {
    render(<Harness />);
    const opener = screen.getByRole('button', { name: 'Open hole' });
    await userEvent.click(opener);

    const cancel = screen.getByRole('button', { name: 'Cancel' });
    expect(cancel).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'Discard changes' })).toHaveFocus();
    await userEvent.tab();
    expect(cancel).toHaveFocus();
    await userEvent.tab({ shift: true });
    expect(screen.getByRole('button', { name: 'Discard changes' })).toHaveFocus();

    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it('runs the action on confirm', async () => {
    const onConfirm = vi.fn();
    render(<Harness onConfirm={onConfirm} />);
    await userEvent.click(screen.getByRole('button', { name: 'Open hole' }));

    await userEvent.click(screen.getByRole('button', { name: 'Discard changes' }));

    expect(onConfirm).toHaveBeenCalledOnce();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes on a backdrop click only when the action is not destructive', async () => {
    const { unmount } = render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'Open hole' }));
    await userEvent.click(screen.getByRole('dialog').parentElement as HTMLElement);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    unmount();

    render(<Harness destructive={false} />);
    await userEvent.click(screen.getByRole('button', { name: 'Open hole' }));
    await userEvent.click(screen.getByRole('dialog').parentElement as HTMLElement);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
