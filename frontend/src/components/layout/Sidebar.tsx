import type { MouseEvent } from 'react';
import type { Me } from '../../api/api';
import { APP_VERSION } from '../../appInfo';
import type { ApiStatus } from '../../hooks/useApiStatus';
import { Icon } from '../ui';

export type Page = 'edit' | 'import';

export const PAGES: readonly { id: Page; label: string; icon: 'list' | 'download' }[] = [
  { id: 'edit', label: 'Edit program', icon: 'list' },
  { id: 'import', label: 'Import program', icon: 'download' },
];

const STATUS_LABEL: Record<ApiStatus, string> = { checking: 'Checking…', online: 'Online', offline: 'Offline' };

interface SidebarProps {
  page: Page;
  me: Me | null;
  status: ApiStatus;
  collapsed: boolean;
  onToggle: () => void;
  /** Called on a page-link click; may call preventDefault (e.g. to ask about unsaved changes first). */
  onNavigate?: (e: MouseEvent<HTMLAnchorElement>, target: Page) => void;
}

export function Sidebar({ page, me, status, collapsed, onToggle, onNavigate }: SidebarProps) {
  const role = me ? (me.isSupervisor ? 'Supervisor' : 'User') : null;
  const statusLabel = STATUS_LABEL[status];

  return (
    <nav className={`sa-nav tw-nav${collapsed ? ' sa-nav--collapsed' : ''}`} aria-label="Main">
      <button
        type="button"
        className="tw-nav__toggle"
        onClick={onToggle}
        aria-label={collapsed ? 'Expand sidebar' : 'Techno Wells, collapse sidebar'}
        aria-expanded={!collapsed}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {!collapsed && <span className="tw-nav__title">Techno Wells</span>}
        <Icon name={collapsed ? 'chevronsRight' : 'chevronsLeft'} />
      </button>

      {PAGES.map((p) => (
        <a
          key={p.id}
          className={`sa-nav__item${page === p.id ? ' is-active' : ''}`}
          href={`#${p.id}`}
          onClick={onNavigate && ((e) => onNavigate(e, p.id))}
          aria-current={page === p.id ? 'page' : undefined}
          aria-label={collapsed ? p.label : undefined}
          title={collapsed ? p.label : undefined}
        >
          <Icon name={p.icon} />
          {!collapsed && <span>{p.label}</span>}
        </a>
      ))}

      <div className="sa-nav__spacer" />

      {!collapsed && me && (
        <div className="tw-nav__user">
          <span className="tw-nav__role">{role}</span>
          <span className="tw-nav__name" title={me.name}>{me.name}</span>
        </div>
      )}

      <div className="tw-nav__foot" title={collapsed ? [statusLabel, me?.name, `v${APP_VERSION}`].filter(Boolean).join(' · ') : undefined}>
        <span className="tw-nav__status" role="status">
          <span className={`tw-dot tw-dot--${status}`} aria-hidden="true" />
          <span className={collapsed ? 'tw-sr' : undefined}>{statusLabel}</span>
        </span>
        {!collapsed && <span className="tw-nav__version">v{APP_VERSION}</span>}
      </div>
    </nav>
  );
}
