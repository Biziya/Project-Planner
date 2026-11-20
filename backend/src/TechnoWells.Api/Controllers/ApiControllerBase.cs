using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TechnoWells.Core.Services;
using TechnoWells.Core.Validation;

namespace TechnoWells.Api.Controllers;

public sealed record StagedHoleDto(Hole Hole, IReadOnlyList<Issue> Issues, int ErrorCount, int WarningCount)
{
    public static StagedHoleDto From(StagedHole s) =>
        new(s.Hole, s.Issues, s.Issues.Count(i => i.Level == IssueLevel.Error), s.Issues.Count(i => i.Level == IssueLevel.Warning));
}
public sealed record SaveResponse(bool Saved, IReadOnlyList<Issue> Issues, string? Message, Hole? Mine, Hole? InAcquire);
public sealed record SendRequest(List<Guid> StagingIds);
public sealed record ResolveRequest(Guid StagingId, string Keep);
public sealed record FailRequest(string Comment);
public sealed record ValidateManyRequest(List<string> HoleIds);
public sealed record ParseRequest(string HoleId);

/// <summary>Common base: every endpoint requires a signed-in user (spec N-01).</summary>
[ApiController]
[Authorize]
public abstract class ApiControllerBase : ControllerBase
{
    /// <summary>200 when saved, 409 with both versions on a conflict, 422 with the issues otherwise.</summary>
    protected IActionResult ToResult(SaveOutcome r)
    {
        var body = new SaveResponse(r.Saved, r.Issues, r.Message, r.Mine, r.InAcquire);
        if (r.Saved) return Ok(body);
        if (r.InAcquire is not null) return Conflict(body);
        return UnprocessableEntity(body);
    }

    protected IActionResult ExcelUnavailable() =>
        Problem("Excel import/export needs the SQL layer (Storage:Mode = Sql).", statusCode: 501);
}
