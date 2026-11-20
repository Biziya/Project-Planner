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

describe('Edit program page', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.location.hash = '#edit';
  });
  afterEach(() => { toast.clear(); });

  /** Renders the app and waits until the hole opens; returns the hole list. */
  async function openPage(holeId?: string) {
    render(<App />);
    const list = await screen.findByRole('complementary', { name: 'Holes' });
    await screen.findByRole('heading', { name: 'Drillhole header' });
    if (holeId) {
      await userEvent.click(within(list).getByRole('button', { name: holeId }));
      await screen.findByText(holeId, { selector: 'b' });
    }
    return list;
  }

  async function changeAzimuth(value: string) {
    const azimuth = screen.getByRole('spinbutton', { name: 'Azimuth' });
    await userEvent.clear(azimuth);
    await userEvent.type(azimuth, value);
  }

  it('asks before discarding unsaved changes; Cancel keeps the edits', async () => {
    render(<App />);
    const list = await screen.findByRole('complementary', { name: 'Holes' });
    const links = await within(list).findAllByRole('button', { name: /^[A-Z]+_/ });
    const [first, second] = links;
    if (!first || !second) throw new Error('the mock list needs two holes');
    await screen.findByRole('heading', { name: 'Drillhole header' });

    const depth = screen.getByRole('spinbutton', { name: 'Planned depth' });
    await userEvent.clear(depth);
    await userEvent.type(depth, '123');
    await userEvent.click(second);

    const dialog = screen.getByRole('dialog', { name: 'Discard your changes?' });
    expect(within(dialog).getByRole('button', { name: 'Discard changes' })).toHaveClass('bg-red-600');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: 'Planned depth' })).toHaveValue(123);
  });

  it('marks the open hole in the list with the light blue selection', async () => {
    render(<App />);
    const list = await screen.findByRole('complementary', { name: 'Holes' });
    await screen.findByRole('heading', { name: 'Drillhole header' });

    const current = within(list).getAllByRole('button').find((b) => b.getAttribute('aria-current') === 'true');
    expect(current?.closest('td')).toHaveClass('bg-gblue-light');
  });

  it('always shows Clear filters, and it clears them', async () => {
    const list = await openPage();
    expect(within(list).getByRole('button', { name: 'Clear filters' })).toBeInTheDocument();

    await userEvent.type(within(list).getByRole('searchbox'), 'PZO');
    await userEvent.click(within(list).getByRole('button', { name: 'Clear filters' }));
    expect(within(list).getByRole('searchbox')).toHaveValue('');
  });

  it('always shows the hole list (no Hide list button)', async () => {
    await openPage();
    expect(screen.queryByRole('button', { name: /Hide list|Show list/ })).not.toBeInTheDocument();
  });

  it('asks before leaving the page with unsaved changes', async () => {
    await openPage();
    await changeAzimuth('45');

    await userEvent.click(screen.getByRole('link', { name: 'Import program' }));
    const dialog = screen.getByRole('dialog', { name: 'Discard your changes?' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    expect(screen.getByRole('heading', { level: 1, name: 'Edit program' })).toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: 'Azimuth' })).toHaveValue(45);
  });

  it('saves with Ctrl+S', async () => {
    await openPage('IZO_447_054_44_A_');
    await changeAzimuth('30');
    await userEvent.keyboard('{Control>}s{/Control}');

    expect(await screen.findByText('IZO_447_054_44_A_ saved')).toBeInTheDocument();
  });

  it('Validate for drilling validates a saved PROGRAM_TOVALIDATE hole', async () => {
    await openPage('PZO_446_055_44_A_');
    await userEvent.click(screen.getByRole('button', { name: /Validate for drilling/ }));

    expect(await screen.findByText('PZO_446_055_44_A_ validated for drilling')).toBeInTheDocument();
  });
});
