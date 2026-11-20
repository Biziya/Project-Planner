using TechnoWells.Core.Model;
using TechnoWells.Core.Validation;

namespace TechnoWells.Core.Model;

public sealed record LookupItem(string Code, string Description, string? Parent);

public sealed record HoleSummary(string HoleId, HoleStatus Status, string? ProjectCode, string? Prospect,
    string? HolePurpose, string? HolePlanTarget, decimal? X, decimal? Y, decimal? Z);

public sealed record HoleFilter(string? Search, HoleStatus? Status, string? ProjectCode, string? Prospect, string? Purpose, string? Target);

public enum WriteOutcome { Written, Conflict, Refused }

public sealed record WriteResult(WriteOutcome Outcome, string? Message = null, Hole? CurrentInAcquire = null)
{
    public static readonly WriteResult Ok = new(WriteOutcome.Written);
}

public sealed record AuditEntry(string Entity, string? EntityId, string? HoleId, string Action, string? Field, string? OldValue, string? NewValue, string User);

public sealed class ConcurrencyException(string message) : Exception(message);

public sealed record ImportRowIssue(int Row, string? HoleId, string Field, string Rule, string Level, string Message);

public sealed record ExcelHolesRead(IReadOnlyList<(int Row, Hole Hole)> Holes, IReadOnlyList<ImportRowIssue> Issues, string? TemplateVersion);
public sealed record ExcelGtnRead(IReadOnlyList<(int Row, string HoleId, GtnRow Gtn)> Rows, IReadOnlyList<ImportRowIssue> Issues, string? TemplateVersion);
