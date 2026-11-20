using Microsoft.AspNetCore.Mvc;
using TechnoWells.Core.Services;

namespace TechnoWells.Api.Controllers;

/// <summary>Import Program page: holes in Preparation (stg.STG_COLLAR + stg.STG_GEODETAILS).</summary>
[Route("api/staging/holes")]
public sealed class StagingController(StagingService staging) : ApiControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List(CancellationToken ct) => Ok((await staging.ListAsync(ct)).Select(StagedHoleDto.From));

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id, CancellationToken ct) =>
        await staging.GetAsync(id, ct) is { } h ? Ok(StagedHoleDto.From(h)) : NotFound();

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] Hole hole, CancellationToken ct)
    {
        hole.StagingId = null;
        return Ok(StagedHoleDto.From(await staging.SaveAsync(hole, ct)));
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] Hole hole, CancellationToken ct)
    {
        hole.StagingId = id;
        try { return Ok(StagedHoleDto.From(await staging.SaveAsync(hole, ct))); }
        catch (ConcurrencyException e) { return Conflict(new { message = e.Message }); }
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await staging.DeleteAsync(id, ct);
        return NoContent();
    }
}
