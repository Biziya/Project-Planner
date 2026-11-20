# Standard audit: TechnoWells

> **Version:** 1, dated 2026-11-20. Update this file in the same change that fixes an item: tick it off, and record the phase that fixed it.

This audit compares the repo with the team coding standard: React + TS strict, Vite, Tailwind 4, Vitest; ASP.NET Core with Windows auth, SQL Server.

**Agreed changes to the standard:**
- **Data access:** the backend uses **Dapper**, which is fixed. The rule becomes "Dapper, with parameterised SQL only".
- **Deployment:** the frontend and the API are deployed **as two separate sites**. The API serves only `/api`.

## Status by phase

| Phase | Scope | Status |
|---|---|---|
| 0 | Toolchain, lint/test/typecheck, repo hygiene, this audit | **Done** (see "Phase 0 results") |
| — | **Backend rebuilt as a .NET 10 skeleton (2026-11-20)** | **Done.** The old backend is kept under the git tag `old-backend`. The items under "Backend: security and data safety", "Backend layers", "Other server-side checks" and the SQL interpolation and `LIKE` items are **superseded**: the new code doesn't have them. Each new feature must follow the rules in `backend/README.md` |
| 0b | Separate the frontend and API deployments | **Mostly done:** the API has no static files and checks CORS at startup, and the frontend builds to `frontend/dist`. Still to do: strict `VITE_API_BASE_URL` parsing, and Windows sign-in across two sites |
| 1 | Backend security and all-or-nothing writes | **Skeleton done:** Auth/CORS validated at startup, Dev auth only in Development. Writes apply when features are added |
| 2 | Rerunnable, versioned SQL scripts | To do |
| 3 | Data-access tidy-up (keeps Dapper) | **Superseded:** the new skeleton has `ISqlConnectionFactory` and parameterised Dapper |
| 4 | Backend structure (thin controllers, split files, tests per area, READMEs) | **Skeleton done:** one type per file, READMEs, 11 tests |
| — | Frontend on mock data (`npm run dev`) | **Done:** `services/mock`, switched by `VITE_USE_MOCK` |
| 5 | Frontend structure and boundary validation | To do |
| 6 | Design system (Tailwind 4 `@theme`, tokens, toast, confirm, table keyboard) | To do |
| 7 | Never lose work (local drafts, offline) | To do |
| 8 | Docs | To do |

## High-severity conflicts

**Environment**
- [x] **Stray dependencies:** a `frontend/src/node_modules` folder from another project made the app compile against React 19. It was moved out (Phase 0).
- [x] **Frontend tooling:** ESLint, Vitest and Testing Library were missing, as were the `typecheck`, `lint` and `test` scripts (Phase 0). Tailwind 4 is still to do (Phase 6).
- [x] **Backend test runtime:** `dotnet test` couldn't start on machines that have only .NET 10. Fixed with `global.json` and `RollForward=Major` (Phase 0).

**Backend: security and data safety**
- [ ] **Auth falls back to Dev:** `Auth:Mode` defaults to `Dev`, so everyone is signed in as a supervisor, and the client can set its own role with `X-Dev-Supervisor` (`Program.cs:26-30`, `Auth.cs:34`).
- [ ] **Storage falls back to sample data:** `Storage:Mode` defaults to InMemory, and a typo quietly runs sample data. No setting is validated at startup.
- [ ] **KeepMine skips the rules:** `ProgramService.KeepMineAsync` skips the editability, status-change, supervisor and locked-field checks (`ProgramService.cs:51-61`).
- [ ] **Send isn't all-or-nothing:** the acQuire write, the staging delete and the audit run on separate connections (`SendService.cs:36-44,66-70`).
- [ ] **SQL script can't be rerun:** `database/technowells_staging.sql` has no guards, and neither script carries a version note.

**Frontend: data loss and UX**
- [ ] **Local drafts:** drafts aren't saved locally and there is no offline support. Fonts load from Google over the internet.
- [ ] **Response validation:** API responses aren't validated (`api.ts:50-60` returns `as T`).
- [ ] **Non-null assertions:** there are 11 non-null `!` assertions. ESLint now reports them as errors.
- [ ] **Folders per feature:** there are none. The pages are flat files of 180–290 lines.
- [ ] **Tables:** no keyboard movement between cells, no row-number column, no zebra rows.
- [ ] **Confirm and toast:** there is no shared confirm dialog (`window.confirm` is used) and no single toast.

## Medium and low

**Repo hygiene**
- [x] **Committed generated files:** `tsconfig.tsbuildinfo`, the `wwwroot` build output and `appsettings.Development.json` are now untracked and ignored (Phase 0).
- [x] **`.gitignore` gaps:** `.env*`, `dist/`, `TestResults/`, `*.log` and `.idea/` are now covered (Phase 0).
- [x] **Internal names in examples:** server, AD group and IP names in the example files and docs are now placeholders (Phase 0).
- [ ] **Internal names in base config:** `appsettings.json` and the `Auth.cs` default still hold the real server and AD group. They move to per-environment config in Phase 1.

**Backend layers**
- [ ] **Logic in controllers:** `ExcelController`, `HolesController` and `ValidationController` contain logic that belongs in services.
- [ ] **Connection factory:** `SqlConnections` has no interface and isn't checked at startup.
- [ ] **Synchronous lookups:** `IHoleDirectory` and `LookupRepository` are synchronous.
- [ ] **Sample-data repositories:** `InMemoryRepositories.cs` sits in the Api project.
- [ ] **Catch-all files:** `RepositoryModels.cs`, `Contracts.cs` and `ApiControllerBase.cs` each hold many types.
- [ ] **Tests:** all tests are in one `CoreTests.cs`, and the services and repositories have no tests.

**Other server-side checks**
- [ ] **GTN import:** writes to holes in any status.
- [ ] **Staging version check:** skipped when `row_version` is null.
- [ ] **Audit:** written separately from the data it records.
- [ ] **Excel import:** saves row by row, so a failure leaves a partial import.
- [ ] **Error messages:** raw exception text is returned to the client.

**SQL**
- [ ] **Interpolated column lists** in `StagingRepository`.
- [ ] **`LIKE` wildcards** aren't escaped.
- [ ] **Hard-coded `USE ACQMN01_DEV`** in both scripts.
- [ ] **Duplicated views:** the same view definitions are in both scripts.
- [ ] **No `QUOTENAME`** in the dynamic SQL in `update_v2`.

**Frontend structure**
- [ ] **Shared folders:** `hooks/`, `services/`, `types/` and `utils/` are missing.
- [ ] **Domain types** live in `api.ts`.
- [ ] **`ui.tsx`** does five jobs and **`Dialogs.tsx`** holds seven components.
- [ ] **`useLookup`** caches failed lookups permanently.

**Frontend design**
- [ ] **Token names** don't follow the standard's groups (brand, text, border, focus, status, sidebar).
- [ ] **Sidebar** is charcoal, not navy.
- [ ] **Inline styles:** 62 `style={{}}` blocks.
- [ ] **Input states:** no red error tint or amber warning tint, and the focus ring never shows on inputs.
- [ ] **Repetition:** class lists and CSS rules are repeated, and `!important` is used.
- [ ] **`Modal`** has no focus trap.

**Other frontend**
- [ ] **`API_BASE`** isn't validated.
- [ ] **Casts:** 14 `as` casts.
- [ ] **Constants:** some aren't UPPER_SNAKE.
- [ ] **Error-message helper:** the same check is repeated in 5 places.
- [ ] **READMEs:** the frontend has none.

**Docs**
- [ ] **Root README** is out of date: test count, the v2 script, `KeySuggestionService`, the `X-Dev-Supervisor` header, and when the query file is loaded.

## Phase 0 results (2026-11-20)

| Check | Command | Result |
|---|---|---|
| Frontend typecheck | `npm run typecheck` | Passes (`noUncheckedIndexedAccess` and `verbatimModuleSyntax` now on) |
| Frontend lint | `npm run lint` | **12 errors**: 10 `no-non-null-assertion`, 2 `no-invalid-void-type` in `api.ts` (fixed in Phase 5) |
| Frontend tests | `npm test` | 3 passed (first test: `components/ui.test.tsx`) |
| Backend build | `dotnet build backend/TechnoWells.sln` | 0 warnings, 0 errors (warnings now count as errors in every project) |
| Backend tests | `dotnet test backend/TechnoWells.sln` | 29 passed |
