using TechnoWells.Core.HoleIds;
using TechnoWells.Core.Model;
using TechnoWells.Core.Validation;
using TechnoWells.Core.Workflow;

namespace TechnoWells.Core.Services;

// =====================================================================
// Edit Program: holes in acQuire (X-01 … X-13)
// =====================================================================
public sealed record SaveOutcome(bool Saved, IReadOnlyList<Issue> Issues, string? Message, Hole? Mine, Hole? InAcquire);

public sealed class ProgramService(IAcquireReadRepository reader, IAcquireWriteRepository writer, ValidationDependencies v, IAuditRepository audit, ICurrentUser user)
{
    public Task<IReadOnlyList<HoleSummary>> ListAsync(HoleFilter filter, CancellationToken ct = default) => reader.ListProgramHolesAsync(filter, ct);

    public Task<Hole?> GetAsync(string holeId, CancellationToken ct = default) => reader.GetHoleAsync(holeId, ct);

    /// <summary>Saves a hole edited in the form, including a status change (PROJECT ↔ PROGRAM_TOVALIDATE, FAILED).</summary>
    public async Task<SaveOutcome> SaveAsync(Hole edited, CancellationToken ct = default)
    {
        var current = await reader.GetHoleAsync(edited.HoleId, ct);
        if (current is null) return new SaveOutcome(false, Array.Empty<Issue>(), $"Hole {edited.HoleId} is not in acQuire.", null, null);
        if (!StatusRules.IsEditable(current.Status))
            return new SaveOutcome(false, Array.Empty<Issue>(), $"A hole in {current.Status} cannot be edited. Roll it back first.", null, null);

        var transition = StatusRules.CanChange(current.Status, edited.Status, user.IsSupervisor);
        if (!transition.Allowed)
            return new SaveOutcome(false, new[] { new Issue(edited.HoleId, null, nameof(Hole.Status), "V-11", IssueLevel.Error, transition.Reason!) }, transition.Reason, null, null);

        // Locked fields keep their acQuire value whatever the client sends.
        edited.ProjectCode = current.ProjectCode;
        edited.CoordinateSet = current.CoordinateSet;
        edited.Source = "acquire";
        v.Parser.ApplyTo(edited);

        var issues = v.Engine().Validate(edited);
        if (issues.Any(i => i.Level == IssueLevel.Error))
            return new SaveOutcome(false, issues, "Fix the errors before saving.", null, null);

        var result = await writer.UpdateAsync(edited, edited.AcquireVersion ?? "", user.Name, ct);
        if (result.Outcome == WriteOutcome.Conflict)
            return new SaveOutcome(false, issues, "This hole changed in acQuire since you opened it.", edited, result.CurrentInAcquire);
        if (result.Outcome == WriteOutcome.Refused)
            return new SaveOutcome(false, issues, result.Message, null, null);

        await audit.WriteAsync(Diff(current, edited), ct);
        return new SaveOutcome(true, issues, null, null, null);
    }

    public async Task<SaveOutcome> KeepMineAsync(Hole mine, CancellationToken ct = default)
    {
        var current = await reader.GetHoleAsync(mine.HoleId, ct);
        mine.Source = "acquire";
        var issues = v.Engine().Validate(mine);
        if (issues.Any(i => i.Level == IssueLevel.Error)) return new SaveOutcome(false, issues, "Fix the errors before saving.", null, null);
        var r = await writer.ForceUpdateAsync(mine, user.Name, ct);
        if (r.Outcome != WriteOutcome.Written) return new SaveOutcome(false, issues, r.Message, null, null);
        if (current is not null) await audit.WriteAsync(Diff(current, mine), ct);
        return new SaveOutcome(true, issues, null, null, null);
    }

    public async Task<SaveOutcome> ChangeStatusAsync(string holeId, HoleStatus to, string? comment, CancellationToken ct = default)
    {
        var hole = await reader.GetHoleAsync(holeId, ct);
        if (hole is null) return new SaveOutcome(false, Array.Empty<Issue>(), $"Hole {holeId} is not in acQuire.", null, null);
        var check = StatusRules.CanChange(hole.Status, to, user.IsSupervisor);
        if (!check.Allowed) return new SaveOutcome(false, Array.Empty<Issue>(), check.Reason, null, null);

        var from = hole.Status;
        hole.Status = to;
        if (to == HoleStatus.FAILED) hole.FailureComment = comment;
        if (to is HoleStatus.PROGRAM_VALIDATED or HoleStatus.FAILED)
        {
            var issues = v.Engine().Validate(hole);
            if (issues.Any(i => i.Level == IssueLevel.Error)) return new SaveOutcome(false, issues, "Fix the errors first.", null, null);
        }
        var r = await writer.UpdateAsync(hole, hole.AcquireVersion ?? "", user.Name, ct);
        if (r.Outcome != WriteOutcome.Written) return new SaveOutcome(false, Array.Empty<Issue>(), r.Message ?? "This hole changed in acQuire; reload it.", hole, r.CurrentInAcquire);
        await audit.WriteAsync(new[] { new AuditEntry("ACQUIRE", holeId, holeId, "status", "HoleStatus", from.ToString(), to.ToString(), user.Name) }, ct);
        return new SaveOutcome(true, Array.Empty<Issue>(), null, null, null);
    }

    /// <summary>X-10 (Could): create a hole on Edit Program and import it directly.</summary>
    public async Task<SaveOutcome> CreateDirectAsync(Hole hole, CancellationToken ct = default)
    {
        hole.Source = "form";
        hole.Status = HoleStatus.PROJECT;
        v.Parser.ApplyTo(hole);
        var issues = v.Engine().Validate(hole);
        if (issues.Any(i => i.Level == IssueLevel.Error)) return new SaveOutcome(false, issues, "Fix the errors before importing.", null, null);
        var r = await writer.CreateAsync(hole, user.Name, ct);
        if (r.Outcome != WriteOutcome.Written) return new SaveOutcome(false, issues, r.Message ?? "HOLEID already exists in acQuire.", hole, r.CurrentInAcquire);
        await audit.WriteAsync(new[] { new AuditEntry("ACQUIRE", hole.HoleId, hole.HoleId, "create", null, null, null, user.Name) }, ct);
        return new SaveOutcome(true, issues, null, null, null);
    }

    private IEnumerable<AuditEntry> Diff(Hole before, Hole after)
    {
        foreach (var p in typeof(Hole).GetProperties().Where(p => p.PropertyType.IsValueType || p.PropertyType == typeof(string)))
        {
            if (p.Name is nameof(Hole.AcquireVersion) or nameof(Hole.Source) or nameof(Hole.StagingId)) continue;
            var a = Convert.ToString(p.GetValue(before), System.Globalization.CultureInfo.InvariantCulture);
            var b = Convert.ToString(p.GetValue(after), System.Globalization.CultureInfo.InvariantCulture);
            if (a != b) yield return new AuditEntry("ACQUIRE", after.HoleId, after.HoleId, "update", p.Name, a, b, user.Name);
        }
    }
}
