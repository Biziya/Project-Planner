# TechnoWells Drillhole App

A web app to prepare techno/hydro drillholes, check them, and load them into acQuire (ACQMN01).
It implements the *TechnoWells Drillhole App – Specification v1.0*. Rule IDs in the code (V-01, X-01…) refer to that document.

```
frontend/  React 18 + TypeScript (Vite): the Edit program and Import program pages. Runs on mock data for now.
backend/   .NET 10 Web API skeleton: Windows/Dev sign-in, Dapper + SQL Server, tests. Features are added step by step.
database/  SQL scripts for the staging schema (from the first version; review them before using).
docs/      STANDARD-AUDIT.md: what still differs from the team coding standard.
```

The frontend and the API are **two separate sites**. The frontend calls the API at `VITE_API_BASE_URL`, and the API allows that address in `Cors:AllowedOrigins`.

## Run the frontend (mock data, no backend needed)

You need Node.js 20 or later.

```bash
cd frontend
npm install
npm run dev          # http://localhost:5173 (mock data)
```

- **Mock data:** `npm run dev` uses `.env.mock` (`VITE_USE_MOCK=true`). The app then works on in-memory sample holes and drafts from [frontend/src/services/mock](frontend/src/services/mock/README.md).
- **Badge:** a **Mock data** badge shows in the sidebar while mock data is on.
- **Resets:** changes are lost when the page reloads.
- **Not available with mock data:** Excel import and export.

## Run the backend

You need the .NET 10 SDK.

```bash
cd backend/src/TechnoWells.Api
copy appsettings.Development.example.json appsettings.Development.json   # first time only
dotnet run           # http://localhost:5080
```

There are only two endpoints so far:
- `GET /api/health`: open to everyone; reports whether the database is reachable.
- `GET /api/me`: the signed-in user.

See [backend/README.md](backend/README.md) for the settings and how to add a feature.

To run the frontend against the API instead of mock data, use `npm run dev:api`. It proxies `/api` to `:5080`.

## Checks

Run all of these before calling a change done:

- **Backend:** `cd backend && dotnet build && dotnet test`. Warnings count as errors.
- **Frontend:** `cd frontend && npm run typecheck && npm run lint && npm test`.

## History

The first full backend has been replaced by the new skeleton. It had business rules, validation V-01…V-17, the acQuire read/write SQL and the Excel import. It is kept in git under the tag `old-backend`.

To look at it again:

```bash
git show old-backend:README.md
git checkout old-backend -- backend   # restores the old code into the working tree
```
