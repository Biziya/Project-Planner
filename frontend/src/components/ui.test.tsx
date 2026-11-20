import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Banner, StatusChip } from './ui';

describe('Banner', () => {
  it('shows an error as an alert the user can dismiss', async () => {
    const onClose = vi.fn();
    render(<Banner notice={{ kind: 'danger', text: 'Save failed' }} onClose={onClose} />);

    expect(screen.getByRole('alert')).toHaveTextContent('Save failed');
    await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('shows nothing when there is no notice', () => {
    render(<Banner notice={null} onClose={vi.fn()} />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});

describe('StatusChip', () => {
  it('shows the short label for a status awaiting validation', () => {
    render(<StatusChip status="PROGRAM_TOVALIDATE" short />);
    expect(screen.getByText('TO VALIDATE')).toBeInTheDocument();
  });
});
