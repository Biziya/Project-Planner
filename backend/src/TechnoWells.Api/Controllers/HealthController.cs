using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TechnoWells.Api.Models.Health;
using TechnoWells.Api.Repositories;

namespace TechnoWells.Api.Controllers;

public sealed class HealthController(IHealthRepository health) : ApiControllerBase
{
    /// <summary>GET /api/health — open to everyone, for monitoring.</summary>
    [HttpGet]
    [AllowAnonymous]
    public async Task<HealthResponse> Get(CancellationToken cancellationToken)
    {
        var database = await health.CheckDatabaseAsync(cancellationToken);
        return new HealthResponse("ok", JsonNamingPolicy.CamelCase.ConvertName(database.ToString()));
    }
}
