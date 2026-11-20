using Microsoft.AspNetCore.Mvc;
using TechnoWells.Core.Services;

namespace TechnoWells.Api.Controllers;

[Route("api")]
public sealed class ValidationController(ValidationDependencies v) : ApiControllerBase
{
    /// <summary>Splits a HOLEID into its parts (F-03).</summary>
    [HttpPost("holeid/parse")]
    public IActionResult Parse([FromBody] ParseRequest req)
    {
        var parts = v.Parser.TryParse(req.HoleId, out var error);
        return parts is null ? UnprocessableEntity(new { message = error }) : Ok(parts);
    }

    /// <summary>Runs the checks V-01…V-17 without saving (live checks in the form).</summary>
    [HttpPost("validate")]
    public IActionResult Validate([FromBody] Hole hole)
    {
        v.Parser.ApplyTo(hole);
        return Ok(new { hole, issues = v.Engine().Validate(hole) });
    }
}
