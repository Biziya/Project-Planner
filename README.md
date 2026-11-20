# TechnoWells Drillhole App

Web app to prepare techno/hydro drillholes, check them and load them into acQuire (ACQMN01).
It implements the *TechnoWells Drillhole App – Specification v1.0*; requirement and rule IDs
(X-01, S-03, V-07…) in the code refer to that document.

```
backend/   .NET 8 – API, business rules, SQL Server and Excel layer, unit tests
frontend/  React 18 + TypeScript (Vite) – Edit program and Import program pages
database/  technowells_staging.sql – staging database, lookup views, check and load views
```

## 1. Run it in 5 minutes (sample data, no database)

Requirements: .NET 8 SDK, Node.js 20+.

```bash
# API with in-memory sample data (Storage:Mode = InMemory, Auth:Mode = Dev)
cd backend/src/TechnoWells.Api
dotnet run                      # http://localhost:5080 – serves the built front end too

# Front end with hot reload (optional, second terminal)
cd frontend
npm install
npm run dev                     # http://localhost:5173, /api is proxied to :5080
```

In Dev mode everyone is signed in as `dev.user`, supervisor. To test as a non-supervisor, set
`Auth:DevIsSupervisor` to `false` in `appsettings.Development.json`.
Excel import/export needs the SQL mode (section 2); in sample-data mode those buttons return a clear 501 message.

Tests: `cd backend && dotnet test` (26 tests on HOLEID parsing, validation rules, statuses, interval slots, acQuire mapping).

## 2. Connect to the databases (Storage:Mode = Sql)

1. **Staging database**: run `database/technowells_staging.sql` on a test instance (creates, in the `stg` schema of the acQuire database – `ACQMN01_DEV` for tests –
   the objects `stg.STG_COLLAR`, `stg.STG_GEODETAILS`, supporting tables, `stg.v_LOOKUP`, check and load views).
   Fill the `TODO` lookups (sub purpose, people, lithology) once their sources are known.
2. **Settings**: copy `backend/src/TechnoWells.Api/appsettings.Sql.example.json` to `appsettings.Production.json`
   (not committed) and set the connection strings.
3. **acQuire queries**: `backend/src/TechnoWells.Api/acquire-queries.sql` holds the queries tested on ACQMN01_DEV
   (one `-- @query Name` block per query, test parameters for SSMS at the top). It is read at start-up through
   `"AcquireSql": { "QueriesFile": "acquire-queries.sql" }` (already in `appsettings.json`).
   - Reads: Edit program list, hole columns, attributes, GTN, version (object tracking date `QLOH_OBJECTSTATUS.UPDDATE_QLOH`),
     existence, nearby holes (all coordinate sets of the same grid), KEY checks.
   - **Writes are active**: "Send to acQuire" and Edit program saves write into the database of the `Acquire`
     connection string. Every acQuire table is keyed by HOLEID + PROJECTCODE. To switch writing off,
     turn the write queries into comments: sending is then refused with a message.
   - For tests, start from `appsettings.Development.example.json` (Sql mode on ACQMN01_DEV, test HOLEIDs starting with T).
4. **Excel layout** (`ExcelTemplate` section): provisional until the users' template arrives (spec 8.1).
   Replace `HoleColumns`, `IntervalColumns`, `GtnColumns` with the real headers; no code change needed.
   Bump `Version` whenever the layout changes (old files are then refused, B-02).
5. **Sign-in**: host on IIS with Windows Authentication, set `Auth:Mode` = `Windows` and
   `Auth:SupervisorGroup` to the Active Directory group of supervisors.
6. **Service account**: the app pool identity needs read/write on the `stg` schema and the rights agreed for acQuire
   (see section 6 of the SQL script).

## 3. Settings that are still open in the spec (no code change needed)

| Setting | Spec | Where |
| --- | --- | --- |
| Mandatory fields | V-01 | `Validation:MandatoryFields` (+ `MANDATORY` in `frontend/src/api/fields.ts` for the red asterisks) |
| Sub purpose → HOLEID letter | V-04 | `Validation:SubPurposeLetters` |
| Z limits, minimum distance between holes | V-06, V-10 | `Validation:ZMin`, `ZMax`, `MinDistance` |
| KEY unique, KEY a whole number | V-15 | `Validation:KeyMustBeUnique`, `Validation:KeyMustBeNumeric` |
| Suggested KEY (highest KEY of all holes + 1, shown under the KEY field, never filled in) | — | `AcquireSql:MaxKey` (all holes in acQuire, any status) + drafts in `stg.STG_COLLAR` |
| GTN: lithology and CaCO3 risk on the same intervals, or not | V-12, 6.5 | `Validation:GtnSameIntervals` (true = same intervals; false = fallback, a row may carry one attribute and overlaps are checked per attribute) |
| HOLEID pattern, project letters | 6.1 | `HoleId:Pattern`, `HoleId:ProjectCodes` |
| Grid / prospect polygons | V-05 | implement `ISpatialChecker` and register it instead of `NoSpatialChecker` |

## 4. How the code is organised

Same layering as the team's other APIs: **Controllers → Services → Repositories (interfaces + Dapper implementations)**.

```
backend/src/
  TechnoWells.Api/
    Controllers/            API endpoints (spec section 9): Holes, Staging, Send, Excel, Lookups, Validation, Me
    Repositories/InMemory/  sample-data repositories (Storage:Mode = InMemory)
    Auth/                   Windows (IIS) / Dev sign-in, Supervisor role
    Program.cs              configuration, dependency injection, CORS
  TechnoWells.Core/         no external package
    Services/               StagingService, SendService, ProgramService, ImportService, ValidationDependencies
    Services/Interfaces/    ICurrentUser, IExcelTemplateService
    Repositories/Interfaces/ IStagingRepository, IAcquireReadRepository, IAcquireWriteRepository,
                            ILookupRepository, IAuditRepository
    Model/                  Hole, intervals, GTN, acQuire mapping, interval slots, repository records
    Validation/             rules V-01…V-17 (ValidationEngine), settings, IHoleDirectory
    HoleIds/  Workflow/     HOLEID parser, status transitions
  TechnoWells.Infrastructure/
    Repositories/           Dapper + SQL Server: StagingRepository, AcquireReadRepository, AcquireWriteRepository,
                            LookupRepository, HoleDirectoryRepository, AuditRepository, SqlConnections
    Services/               ExcelTemplateService (ClosedXML)
    DependencyInjection.cs  registration for Storage:Mode = Sql
```

The acQuire write repository takes an application lock on each HOLEID (`sp_getapplock`) and checks existence or
version in the same transaction, so two users can never import the same HOLEID (D-06, AT-05).

Front end (`frontend/src`): `pages/EditProgramPage.tsx`, `pages/ImportProgramPage.tsx`, the shared form
`components/HoleForm.tsx` (same component in the pop-up and the side panel), pop-ups in `components/Dialogs.tsx`,
form definition in `api/fields.ts`. Styles: Shared App Design System (`styles/tokens.css`, `styles/bundle.css`).

### API address (front end on another server)

By default the front end calls `/api` on the server that serves it (the API serves the built front end from `wwwroot`).
If the API runs elsewhere, e.g. `https://10.10.10.10:444`:
- front end: copy `frontend/.env.example` to `frontend/.env.production`, set `VITE_API_BASE_URL=https://10.10.10.10:444/api`, then `npm run build`;
- API: add the front end's address to `Cors:AllowedOrigins` in the settings.

`npm run build` writes the front end into `backend/src/TechnoWells.Api/wwwroot`, so the API serves it on one URL.

## 5. Notes for later

| Topic | Note |
| --- | --- |
| Search radius / minimum distance | V-10 distance (`Validation:MinDistance`, 10 m for tests) to agree with the users. V-13 (same coordinates) is a warning for now (`Validation:SameCoordinatesLevel`). |
| HOLELOCATION.STARTDATE / ENDDATE | Can hold the planned drilling dates. Not the responsibility of this app's users for now; to add later (field, mapping, InsertLocation/UpdateLocation). |
| HOLEID format | Real HOLEIDs (e.g. `INZO_0001_1`) differ from the spec pattern: adjust `HoleId:Pattern` once the format is confirmed. |
| Grid limits | Checked by the database when coordinates are written (the send fails for that hole with the database message). Later: the same check in the app (V-05) to warn while typing. |
| Edit program reads | Kept as they are for now (joins on HOLEID only). |

## 6. Status of this starter

| Part | Status |
| --- | --- |
| Core rules and services | Built and tested (26 unit tests) |
| API controllers | Built and run against the front end (same routes as spec section 9) |
| API in sample-data mode | Built and run; send, conflicts, version check, statuses checked end to end |
| Front end | Built; both pages and pop-ups checked in a browser against the API |
| SQL Server and Excel layer | Written, syntax-checked, **not yet compiled against its packages** – first `dotnet build` with NuGet access confirms it |
| acQuire read/write SQL | To fill with the acQuire administrator (section 2.3) |
| Excel column layout | Provisional until the users' template arrives |
| Not built yet | X-12 batch validation UI, F-06 / P-03 copy, A-07 past import sessions page |
