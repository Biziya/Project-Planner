import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatusChip } from './ui';

describe('StatusChip', () => {
  it('shows the short label for a status awaiting validation', () => {
    render(<StatusChip status="PROGRAM_TOVALIDATE" short />);
    expect(screen.getByText('TO VALIDATE')).toBeInTheDocument();
  });
});
