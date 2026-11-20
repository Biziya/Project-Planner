using Microsoft.AspNetCore.Mvc;
using TechnoWells.Core.Services;

namespace TechnoWells.Api.Controllers;

/// <summary>Excel imports and exports (spec 8). Needs the SQL layer (ClosedXML).</summary>
[Route("api")]
public sealed class ExcelController(IServiceProvider services, IStagingRepository staging) : ApiControllerBase
{
    private const string XlsxType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    [HttpPost("imports/holes")]
    public async Task<IActionResult> ImportHoles(IFormFile file, CancellationToken ct)
    {
        if (services.GetService<ImportService>() is not { } import) return ExcelUnavailable();
        await using var stream = file.OpenReadStream();
        return Ok(await import.ImportHolesAsync(stream, ct));
    }

    [HttpPost("imports/gtn")]
    public async Task<IActionResult> ImportGtn(IFormFile file, [FromQuery] string? mode, CancellationToken ct)
    {
        if (services.GetService<ImportService>() is not { } import) return ExcelUnavailable();
        await using var stream = file.OpenReadStream();
        return Ok(await import.ImportGtnAsync(stream, !string.Equals(mode, "add", StringComparison.OrdinalIgnoreCase), ct));
    }

    [HttpGet("exports/template")]
    public IActionResult Template([FromQuery] string? kind, [FromQuery] string? project, [FromQuery] string? prospect,
        [FromQuery] string? purpose, [FromQuery] string? subPurpose, [FromQuery] string? drillType, [FromQuery] int? rows)
    {
        if (services.GetService<IExcelTemplateService>() is not { } excel) return ExcelUnavailable();
        var k = (kind ?? "empty").ToLowerInvariant();
        var prefilled = k == "prefilled"
            ? Enumerable.Range(0, Math.Clamp(rows ?? 20, 1, 1000)).Select(_ => new Hole
                { ProjectCode = project, Prospect = prospect, HolePurpose = purpose, SubPurpose = subPurpose, PlanDrillType = drillType }).ToList()
            : new List<Hole>();
        var bytes = excel.BuildTemplate(prefilled, includeHoleSheets: k != "gtn", includeGtnSheet: true);
        return File(bytes, XlsxType, $"technowells_{k}_template_{excel.CurrentVersion}.xlsx");
    }

    [HttpGet("exports/staging")]
    public async Task<IActionResult> StagingExport(CancellationToken ct)
    {
        if (services.GetService<IExcelTemplateService>() is not { } excel) return ExcelUnavailable();
        var bytes = excel.BuildTemplate(await staging.ListAsync(ct), includeHoleSheets: true, includeGtnSheet: true);
        return File(bytes, XlsxType, $"technowells_staging_{DateTime.UtcNow:yyyyMMdd_HHmm}.xlsx");
    }
}
