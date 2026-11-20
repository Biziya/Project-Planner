# Backend: TechnoWells.Api

This is an ASP.NET Core Web API on .NET 10. It uses Dapper with SQL Server and Windows sign-in. It is a skeleton for now: the structure and the safety rules are in place, and features get added one at a time.

```
backend/
  TechnoWells.slnx
  global.json                 pins the .NET 10 SDK
  Directory.Build.props       shared settings: nullable on, warnings are errors
  src/TechnoWells.Api/
    Program.cs                wiring only
    Configuration/            settings classes, checked at startup (AuthSettings, CorsSettings)
    Auth/                     ICurrentUser, Windows (Negotiate) or Dev sign-in
    Controllers/              thin HTTP layer; inherit ApiControllerBase (/api/..., [Authorize])
    Data/                     ISqlConnectionFactory: opens SQL connections
    Repositories/             one interface + one Dapper class per data area (see README there)
    Models/                   request/response records, one folder per feature (see README there)
  tests/TechnoWells.Api.Tests/  xUnit + WebApplicationFactory: tests that start the real API in memory
```

## Settings (`appsettings.json`, then `appsettings.{Environment}.json`)

| Key | Meaning | Checked at startup |
| --- | --- | --- |
| `Auth:Mode` | `Windows` (Negotiate/IIS) or `Dev` | Unknown value → the app stops. `Dev` outside Development → the app stops |
| `Auth:SupervisorGroup` | AD group whose members are supervisors (Windows mode) | Required in Windows mode |
| `Auth:DevUser`, `Auth:DevIsSupervisor` | Who you are in Dev mode | — |
| `Cors:AllowedOrigins` | Addresses of the frontend site | At least one; full http(s) addresses; no `*` |
| `ConnectionStrings:TechnoWells` | SQL Server database | Optional for now. When it's empty, `/api/health` reports `notConfigured` |

`appsettings.Development.json` and `appsettings.Production.json` are not committed. Start from `appsettings.Development.example.json`.

## Endpoints

| Route | Who | Returns |
| --- | --- | --- |
| `GET /api/health` | anyone | `{ "status": "ok", "database": "notConfigured" \| "ok" \| "unreachable" }` |
| `GET /api/me` | signed-in user | `{ "name": "...", "isSupervisor": true }` (same shape as the frontend's `Me`) |

## Adding a feature (e.g. holes)

1. **Models:** add `Models/Holes/` with request and response records, one file per type.
2. **Repository:** add `Repositories/IHoleRepository.cs` and `Repositories/HoleRepository.cs`.
   - Use Dapper with **parameterised SQL only**: `new { holeId }`, never string concatenation.
   - Do writes that change several tables inside one transaction.
3. **Register it:** add the repository in `RepositoryServiceCollectionExtensions.AddRepositories`.
4. **Controller:** add `Controllers/HolesController.cs : ApiControllerBase`.
   - Keep it thin: read the request, call the repository, return the result.
   - Get the user from `ICurrentUser`, never from the request body.
   - Repeat on the server every check the frontend makes.
5. **Tests:** add `tests/.../HolesTests.cs`.
6. **Frontend:** switch the matching calls from the mock to the real API (see `frontend/src/services/mock/README.md`).

## Commands

```bash
dotnet build          # in backend/
dotnet test
dotnet run --project src/TechnoWells.Api   # http://localhost:5080
```
