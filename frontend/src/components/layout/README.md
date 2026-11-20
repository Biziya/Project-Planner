# Layout

The frame around the pages. `App.tsx` puts these together.

| File | Job |
| --- | --- |
| `Sidebar.tsx` | The app name and the collapse button (`«` / `»`), the page links, the user's role and sign-in name, the Online/Offline dot and the version. It also exports `Page` and `PAGES` |
| `HelpButton.tsx` | The `?` button in the top bar. It opens a dialog with short help for the current page |

- **Online/Offline:** the status comes from `hooks/useApiStatus.ts`, which calls `GET /api/health` every 30 seconds.
- **Version:** comes from `src/appInfo.ts`.
- **Collapsed sidebar:** `App.tsx` remembers whether the sidebar is collapsed in `localStorage` (key `tw.sidebarCollapsed`). If storage is blocked, it falls back to expanded.
