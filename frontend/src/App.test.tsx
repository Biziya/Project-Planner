import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App, { SIDEBAR_KEY } from './App';
import type * as ApiModule from './api/api';

// Run the whole app on the in-memory mock API, with no delay.
vi.mock('./api/api', async (importOriginal) => {
  const original = await importOriginal<typeof ApiModule>();
  const { createMockApi } = await import('./services/mock/mockApi');
  return { ...original, api: createMockApi(undefined, 0) };
});

describe('App shell', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.location.hash = '#edit';
  });
  afterEach(() => { window.localStorage.clear(); });

  it('shows the sidebar with the signed-in user, Online status and no breadcrumb or mock badge', async () => {
    render(<App />);
    const nav = screen.getByRole('navigation', { name: 'Main' });

    expect(await within(nav).findByText('mock.user')).toBeInTheDocument();
    expect(within(nav).getByText('Supervisor')).toBeInTheDocument();
    expect(await within(nav).findByText('Online')).toBeInTheDocument();
    expect(screen.queryByText(/Techno Wells ›/)).not.toBeInTheDocument();
    expect(screen.queryByText('Mock data')).not.toBeInTheDocument();
  });

  it('has no top bar and no "Program" overline above the page title', async () => {
    render(<App />);

    expect(await screen.findByRole('heading', { level: 1, name: 'Edit program' })).toBeInTheDocument();
    expect(screen.queryByRole('banner')).not.toBeInTheDocument();
    expect(screen.queryByText('Program', { exact: true })).not.toBeInTheDocument();
  });

  it('puts the help button on the same row as Hide list and New drillhole', async () => {
    render(<App />);

    const help = await screen.findByRole('button', { name: 'Help' });
    const actions = help.closest('.sa-pagehead__actions');
    if (!(actions instanceof HTMLElement)) throw new Error('help button is not in the page head');
    expect(within(actions).getByRole('button', { name: 'Hide list' })).toBeInTheDocument();
    expect(within(actions).getByRole('button', { name: /New drillhole/ })).toBeInTheDocument();

    await userEvent.click(help);
    expect(screen.getByRole('dialog', { name: 'Help: Edit program' })).toBeInTheDocument();
  });

  it('shows the help button on the Import page too', async () => {
    window.location.hash = '#import';
    render(<App />);

    await userEvent.click(await screen.findByRole('button', { name: 'Help' }));

    expect(screen.getByRole('dialog', { name: 'Help: Import program' })).toBeInTheDocument();
  });

  it('collapses and expands the sidebar, and remembers the choice', async () => {
    const { unmount } = render(<App />);

    await userEvent.click(screen.getByRole('button', { name: /collapse sidebar/i }));
    expect(screen.queryByText('Techno Wells')).not.toBeInTheDocument();
    expect(window.localStorage.getItem(SIDEBAR_KEY)).toBe('true');

    unmount();
    render(<App />);
    expect(screen.getByRole('button', { name: 'Expand sidebar' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Expand sidebar' }));
    expect(screen.getByText('Techno Wells')).toBeInTheDocument();
    expect(window.localStorage.getItem(SIDEBAR_KEY)).toBe('false');
  });

  it('still works when browser storage is blocked', async () => {
    const getItem = vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    const setItem = vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    try {
      render(<App />);

      await userEvent.click(screen.getByRole('button', { name: /collapse sidebar/i }));

      expect(screen.getByRole('button', { name: 'Expand sidebar' })).toBeInTheDocument();
    } finally {
      getItem.mockRestore();
      setItem.mockRestore();
    }
  });
});
