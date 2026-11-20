using Microsoft.AspNetCore.Mvc;

namespace TechnoWells.Api.Controllers;

[Route("api/lookups")]
public sealed class LookupsController(ILookupRepository lookups) : ApiControllerBase
{
    /// <summary>Values of a lookup L01–L16 (spec 5.4); optional parent filter (e.g. campaigns of a project).</summary>
    [HttpGet("{id}")]
    public IActionResult Get(string id, [FromQuery] string? parent) => Ok(lookups.Get(id.ToUpperInvariant(), parent));
}
