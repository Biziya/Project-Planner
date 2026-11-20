import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Me } from '../../api/api';
import { APP_VERSION } from '../../appInfo';
import type { ApiStatus } from '../../hooks/useApiStatus';
import { Sidebar, type Page } from './Sidebar';

const SUPERVISOR: Me = { name: 'BDOM\\jdoe', isSupervisor: true };

function renderSidebar(props: { page?: Page; me?: Me | null; status?: ApiStatus; collapsed?: boolean; onToggle?: () => void } = {}) {
  const onToggle = props.onToggle ?? vi.fn();
  render(
    <Sidebar
      page={props.page ?? 'edit'}
      me={props.me === undefined ? SUPERVISOR : props.me}
      status={props.status ?? 'online'}
      collapsed={props.collapsed ?? false}
      onToggle={onToggle}
    />,
  );
  return { onToggle, nav: screen.getByRole('navigation', { name: 'Main' }) };
}

describe('Sidebar', () => {
  it('shows the app name and both page links, marking the current page', () => {
    const { nav } = renderSidebar({ page: 'import' });

    expect(within(nav).getByText('Techno Wells')).toBeInTheDocument();
    expect(within(nav).getByRole('link', { name: 'Import program' })).toHaveAttribute('aria-current', 'page');
    expect(within(nav).getByRole('link', { name: 'Edit program' })).not.toHaveAttribute('aria-current');
    expect(within(nav).getByRole('link', { name: 'Edit program' })).toHaveAttribute('href', '#edit');
  });

  it('shows the role and sign-in name of a supervisor', () => {
    renderSidebar();

    expect(screen.getByText('Supervisor')).toBeInTheDocument();
    expect(screen.getByText('BDOM\\jdoe')).toBeInTheDocument();
  });

  it('shows "User" for someone who is not a supervisor', () => {
    renderSidebar({ me: { name: 'BDOM\\asmith', isSupervisor: false } });

    expect(screen.getByText('User')).toBeInTheDocument();
    expect(screen.queryByText('Supervisor')).not.toBeInTheDocument();
  });

  it('shows the version', () => {
    renderSidebar();

    expect(screen.getByText(`v${APP_VERSION}`)).toBeInTheDocument();
  });

  it.each<[ApiStatus, string]>([
    ['online', 'Online'],
    ['offline', 'Offline'],
    ['checking', 'Checking…'],
  ])('shows the %s status as "%s"', (status, label) => {
    renderSidebar({ status });

    expect(screen.getByRole('status')).toHaveTextContent(label);
  });

  it('calls onToggle when the collapse button is pressed', async () => {
    const { onToggle } = renderSidebar();

    await userEvent.click(screen.getByRole('button', { name: 'Collapse sidebar' }));

    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('when collapsed, hides the labels but keeps the links and status accessible', () => {
    const { nav } = renderSidebar({ collapsed: true, status: 'offline' });

    expect(within(nav).queryByText('Techno Wells')).not.toBeInTheDocument();
    expect(within(nav).queryByText('Supervisor')).not.toBeInTheDocument();
    expect(within(nav).queryByText(`v${APP_VERSION}`)).not.toBeInTheDocument();
    expect(within(nav).getByRole('link', { name: 'Edit program' })).toBeInTheDocument();
    expect(within(nav).getByRole('link', { name: 'Import program' })).toBeInTheDocument();
    expect(within(nav).getByRole('button', { name: 'Expand sidebar' })).toHaveAttribute('aria-expanded', 'false');
    expect(within(nav).getByRole('status')).toHaveTextContent('Offline');
  });

  it('shows no user block before the user is known', () => {
    renderSidebar({ me: null });

    expect(screen.queryByText('Supervisor')).not.toBeInTheDocument();
    expect(screen.queryByText('User')).not.toBeInTheDocument();
  });
});
