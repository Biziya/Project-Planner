import { useEffect, useState } from 'react';
import { api, ApiError, type Me } from './api/api';
import { Sidebar, type Page } from './components/layout/Sidebar';
import { useApiStatus } from './hooks/useApiStatus';
import { EditProgramPage } from './pages/EditProgramPage';
import { ImportProgramPage } from './pages/ImportProgramPage';

const pageFromHash = (): Page => (window.location.hash === '#import' ? 'import' : 'edit');

export const SIDEBAR_KEY = 'tw.sidebarCollapsed';

function readCollapsed(): boolean {
  try { return window.localStorage.getItem(SIDEBAR_KEY) === 'true'; }
  catch { return false; }
}

function writeCollapsed(value: boolean): void {
  try { window.localStorage.setItem(SIDEBAR_KEY, String(value)); }
  catch { /* storage blocked: the choice lasts until reload */ }
}

export default function App() {
  const [page, setPage] = useState<Page>(pageFromHash);
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<boolean>(readCollapsed);
  const status = useApiStatus();

  useEffect(() => {
    const onHash = () => setPage(pageFromHash());
    window.addEventListener('hashchange', onHash);
    api.me().then(setMe).catch((e) => setError(e instanceof ApiError ? e.message : 'Sign-in failed.'));
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const toggleSidebar = () => {
    setCollapsed((c) => {
      writeCollapsed(!c);
      return !c;
    });
  };

  return (
    <div className="sa tw-app">
      <div className="sa-shell">
        <Sidebar page={page} me={me} status={status} collapsed={collapsed} onToggle={toggleSidebar} />
        <div className="sa-main">
          <main className="sa-content">
            {error && <div role="alert" className="sa-note sa-note--danger">{error}</div>}
            {me && (page === 'edit' ? <EditProgramPage me={me} /> : <ImportProgramPage me={me} />)}
          </main>
        </div>
      </div>
    </div>
  );
}
