import { useEffect, useState } from 'react';
import { api, ApiError, type Me } from './api/api';
import { Icon } from './components/ui';
import { USE_MOCK } from './config';
import { EditProgramPage } from './pages/EditProgramPage';
import { ImportProgramPage } from './pages/ImportProgramPage';

type Page = 'edit' | 'import';
const pageFromHash = (): Page => (window.location.hash === '#import' ? 'import' : 'edit');

export default function App() {
  const [page, setPage] = useState<Page>(pageFromHash);
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onHash = () => setPage(pageFromHash());
    window.addEventListener('hashchange', onHash);
    api.me().then(setMe).catch((e) => setError(e instanceof ApiError ? e.message : 'Sign-in failed.'));
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const initials = me?.name.split(/[\\\s.]+/).filter(Boolean).slice(-2).map((s) => s[0]!.toUpperCase()).join('') ?? '';

  return (
    <div className="sa tw-app">
      <div className="sa-shell">
        <nav className="sa-nav" aria-label="Main">
          <div className="sa-nav__brand"><span className="sa-mono-badge" style={{ ['--app-colour' as string]: 'var(--section-blue)' }}>TW</span><span>Techno Wells</span></div>
          <a className={`sa-nav__item${page === 'edit' ? ' is-active' : ''}`} href="#edit" aria-current={page === 'edit' ? 'page' : undefined}><Icon name="list" /><span>Edit program</span></a>
          <a className={`sa-nav__item${page === 'import' ? ' is-active' : ''}`} href="#import" aria-current={page === 'import' ? 'page' : undefined}><Icon name="download" /><span>Import program</span></a>
          <div className="sa-nav__spacer" />
          {USE_MOCK && <span className="sa-status sa-status--warning tw-mockbadge" title="Data is in memory only and resets on reload">Mock data</span>}
        </nav>
        <div className="sa-main">
          <header className="sa-topbar">
            <span className="sa-crumbs">Techno Wells › <b>{page === 'edit' ? 'Edit program' : 'Import program'}</b></span>
            <span style={{ marginLeft: 'auto' }} />
            {me && <span className="caption sa-muted">{me.isSupervisor ? 'Supervisor' : 'User'}</span>}
            <span className="sa-avatar" title={me?.name}>{initials}</span>
          </header>
          <main className="sa-content">
            {error && <div role="alert" className="sa-note sa-note--danger">{error}</div>}
            {me && (page === 'edit' ? <EditProgramPage me={me} /> : <ImportProgramPage me={me} />)}
          </main>
        </div>
      </div>
    </div>
  );
}
