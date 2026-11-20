using Microsoft.AspNetCore.Mvc;
using TechnoWells.Core.Services;

namespace TechnoWells.Api.Controllers;

/// <summary>Edit Program page: holes already in acQuire (X-01 … X-13).</summary>
[Route("api/holes")]
public sealed class HolesController(ProgramService program, ValidationDependencies v) : ApiControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List([FromQuery] string? search, [FromQuery] HoleStatus? status, [FromQuery] string? project,
        [FromQuery] string? prospect, [FromQuery] string? purpose, [FromQuery] string? target, CancellationToken ct) =>
        Ok(await program.ListAsync(new HoleFilter(search, status, project, prospect, purpose, target), ct));

    [HttpGet("{holeId}")]
    public async Task<IActionResult> Get(string holeId, CancellationToken ct) =>
        await program.GetAsync(holeId, ct) is { } h
            ? Ok(new { hole = h, issues = v.Engine().Validate(h) })
            : NotFound(new { message = $"Hole {holeId} is not in acQuire." });

    [HttpPut("{holeId}")]
    public async Task<IActionResult> Save(string holeId, [FromBody] Hole hole, CancellationToken ct)
    {
        hole.HoleId = holeId;
        return ToResult(await program.SaveAsync(hole, ct));
    }

    /// <summary>Conflict resolved with "Keep my version" (X-05).</summary>
    [HttpPost("{holeId}/keep-mine")]
    public async Task<IActionResult> KeepMine(string holeId, [FromBody] Hole hole, CancellationToken ct)
    {
        hole.HoleId = holeId;
        return ToResult(await program.KeepMineAsync(hole, ct));
    }

    /// <summary>X-10: create a hole and import it directly.</summary>
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] Hole hole, CancellationToken ct) => ToResult(await program.CreateDirectAsync(hole, ct));

    /// <summary>X-07: PROGRAM_TOVALIDATE → PROGRAM_VALIDATED (supervisors only).</summary>
    [HttpPost("{holeId}/validate")]
    public async Task<IActionResult> ValidateForDrilling(string holeId, CancellationToken ct) =>
        ToResult(await program.ChangeStatusAsync(holeId, HoleStatus.PROGRAM_VALIDATED, null, ct));

    /// <summary>X-12 (Could): several holes at once, result per hole.</summary>
    [HttpPost("validate")]
    public async Task<IActionResult> ValidateMany([FromBody] ValidateManyRequest req, CancellationToken ct)
    {
        var results = new List<object>();
        foreach (var id in req.HoleIds)
        {
            var r = await program.ChangeStatusAsync(id, HoleStatus.PROGRAM_VALIDATED, null, ct);
            results.Add(new { holeId = id, r.Saved, r.Message });
        }
        return Ok(results);
    }

    /// <summary>X-08: Roll back to picket, PROGRAM_VALIDATED → PROJECT.</summary>
    [HttpPost("{holeId}/rollback")]
    public async Task<IActionResult> Rollback(string holeId, CancellationToken ct) =>
        ToResult(await program.ChangeStatusAsync(holeId, HoleStatus.PROJECT, null, ct));

    /// <summary>X-13: cancelled hole, status FAILED with a mandatory comment.</summary>
    [HttpPost("{holeId}/fail")]
    public async Task<IActionResult> Fail(string holeId, [FromBody] FailRequest req, CancellationToken ct) =>
        ToResult(await program.ChangeStatusAsync(holeId, HoleStatus.FAILED, req.Comment, ct));
}
