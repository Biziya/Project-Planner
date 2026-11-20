import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { api, type Me } from './api/api';
import { Sidebar, type Page } from './components/layout/Sidebar';
import { Toaster } from './components/toast/Toaster';
import { errorText, toast } from './components/toast/toast';
import { useApiStatus } from './hooks/useApiStatus';
import { EditProgramPage, type LeaveGuard } from './pages/EditProgramPage';
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
  const [collapsed, setCollapsed] = useState<boolean>(readCollapsed);
  const status = useApiStatus();
  const leaveGuard: LeaveGuard = useRef(null);

  /** A page link asks first when the Edit page has unsaved changes. */
  const navigate = (e: MouseEvent<HTMLAnchorElement>, target: Page) => {
    const ask = leaveGuard.current;
    if (!ask || target === page) return;
    e.preventDefault();
    ask(() => { window.location.hash = target; });
  };

  useEffect(() => {
    const onHash = () => setPage(pageFromHash());
    window.addEventListener('hashchange', onHash);
    api.me().then(setMe).catch((e) => toast.error(errorText('Sign-in failed', e)));
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
        <Sidebar page={page} me={me} status={status} collapsed={collapsed} onToggle={toggleSidebar} onNavigate={navigate} />
        <div className="sa-main">
          <main className={`sa-content${page === 'edit' ? ' bg-white' : ''}`}>
            {me && (page === 'edit' ? <EditProgramPage me={me} leaveGuard={leaveGuard} /> : <ImportProgramPage me={me} />)}
          </main>
        </div>
      </div>
      <Toaster />
    </div>
  );
}
