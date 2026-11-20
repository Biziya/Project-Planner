using Microsoft.AspNetCore.Mvc;
using TechnoWells.Core.Services;

namespace TechnoWells.Api.Controllers;

/// <summary>Send to acQuire (spec 10.1) and conflict resolution (X-05).</summary>
[Route("api/send")]
public sealed class SendController(SendService send) : ApiControllerBase
{
    [HttpPost]
    public async Task<IActionResult> Send([FromBody] SendRequest req, CancellationToken ct) => Ok(await send.SendAsync(req.StagingIds, ct));

    [HttpPost("resolve")]
    public async Task<IActionResult> Resolve([FromBody] ResolveRequest req, CancellationToken ct)
    {
        var r = await send.ResolveAsync(req.StagingId, string.Equals(req.Keep, "mine", StringComparison.OrdinalIgnoreCase), ct);
        return r.Outcome == WriteOutcome.Written ? Ok() : Conflict(new { message = r.Message });
    }
}
