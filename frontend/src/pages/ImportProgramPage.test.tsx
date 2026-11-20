import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import type * as ApiModule from '../api/api';
import { toast } from '../components/toast/toast';

vi.mock('../api/api', async (importOriginal) => {
  const original = await importOriginal<typeof ApiModule>();
  const { createMockApi } = await import('../services/mock/mockApi');
  return { ...original, api: createMockApi(undefined, 0) };
});

describe('Import program page', () => {
  beforeEach(() => { window.location.hash = '#import'; });
  afterEach(() => { toast.clear(); });

  it('has the Send button in the table head, counting the ticked drafts', async () => {
    render(<App />);
    expect(await screen.findByRole('button', { name: 'Send to acQuire (3)' })).toBeEnabled();
    expect(screen.getByText(/· 3 selected/)).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Selection' })).not.toBeInTheDocument();

    for (const box of screen.getAllByRole('checkbox', { checked: true })) await userEvent.click(box);
    expect(screen.getByRole('button', { name: 'Send to acQuire (0)' })).toBeDisabled();
  });

  it('shows Import Excel, Export Excel, Import GTN and Help as separate buttons', async () => {
    render(<App />);
    expect(await screen.findByRole('button', { name: 'Import Excel' })).toHaveClass('bg-blue-600');
    expect(screen.getByRole('button', { name: 'Import GTN (Excel)' })).toHaveClass('bg-blue-600');
    expect(screen.getByRole('button', { name: 'Help' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'More actions' })).not.toBeInTheDocument();

    const exportButton = screen.getByRole('button', { name: /Export Excel/ });
    expect(exportButton).toHaveClass('bg-white', 'border-gray-300');
    exportButton.focus();
    await userEvent.keyboard('{Enter}');
    for (const name of [/Empty template/, /Staging table/, /Pre-filled template/, /GTN template/]) {
      expect(screen.getByRole('menuitem', { name })).toBeInTheDocument();
    }
    expect(screen.getByRole('menuitem', { name: /Staging table/ })).toHaveAttribute('href');
  });

  it('asks in a dialog before deleting a draft, then confirms with a toast', async () => {
    render(<App />);
    await userEvent.click(await screen.findByRole('button', { name: 'Delete IZO_454_058_44_A_' }));

    const dialog = screen.getByRole('dialog', { name: 'Delete draft IZO_454_058_44_A_?' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete draft' }));

    expect(await screen.findByText('IZO_454_058_44_A_ deleted')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete IZO_454_058_44_A_' })).not.toBeInTheDocument();
  });
});
