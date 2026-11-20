using TechnoWells.Core.HoleIds;
using TechnoWells.Core.Model;
using TechnoWells.Core.Validation;
using TechnoWells.Core.Workflow;

namespace TechnoWells.Core.Services;

// =====================================================================
// Send to acQuire (spec 10.1)
// =====================================================================
public enum SendOutcome { Imported, NotSent, Conflict, Failed }

public sealed record SendItem(Guid StagingId, string HoleId, SendOutcome Outcome, string? Message, IReadOnlyList<Issue> Issues, Hole? Mine, Hole? InAcquire);

public sealed class SendService(IStagingRepository repo, IAcquireWriteRepository writer, ValidationDependencies v, IAuditRepository audit, ICurrentUser user)
{
    public async Task<IReadOnlyList<SendItem>> SendAsync(IReadOnlyCollection<Guid> ids, CancellationToken ct = default)
    {
        var holes = new List<Hole>();
        foreach (var id in ids)
            if (await repo.GetAsync(id, ct) is { } h) holes.Add(h);

        var engine = v.Engine(holes.Select(h => h.HoleId).ToList());
        var results = new List<SendItem>();
        foreach (var hole in holes)
        {
            var issues = engine.Validate(hole);
            if (issues.Any(i => i.Level == IssueLevel.Error && i.Rule != "V-03"))
            {
                results.Add(new SendItem(hole.StagingId!.Value, hole.HoleId, SendOutcome.NotSent, "Fix the errors first.", issues, null, null));
                continue;
            }

            hole.Status = HoleStatus.PROJECT;
            WriteResult write;
            try { write = await writer.CreateAsync(hole, user.Name, ct); }
            catch (Exception ex) { results.Add(new SendItem(hole.StagingId!.Value, hole.HoleId, SendOutcome.Failed, ex.Message, issues, null, null)); continue; }

            switch (write.Outcome)
            {
                case WriteOutcome.Written:
                    await repo.DeleteAsync(hole.StagingId!.Value, user.Name, ct);
                    await audit.WriteAsync(new[] { new AuditEntry("ACQUIRE", hole.HoleId, hole.HoleId, "send", "HoleStatus", "Preparation", "PROJECT", user.Name) }, ct);
                    results.Add(new SendItem(hole.StagingId!.Value, hole.HoleId, SendOutcome.Imported, null, issues, null, null));
                    break;
                case WriteOutcome.Conflict:
                    hole.Status = HoleStatus.Preparation;
                    results.Add(new SendItem(hole.StagingId!.Value, hole.HoleId, SendOutcome.Conflict, write.Message ?? "HOLEID already exists in acQuire.", issues, hole, write.CurrentInAcquire));
                    break;
                default:
                    hole.Status = HoleStatus.Preparation;
                    results.Add(new SendItem(hole.StagingId!.Value, hole.HoleId, SendOutcome.NotSent, write.Message, issues, null, null));
                    break;
            }
        }
        return results;
    }

    /// <summary>Conflict choice after a send (X-05): keep mine overwrites acQuire, keep acQuire drops the draft.</summary>
    public async Task<WriteResult> ResolveAsync(Guid stagingId, bool keepMine, CancellationToken ct = default)
    {
        var hole = await repo.GetAsync(stagingId, ct) ?? throw new KeyNotFoundException("Draft not found.");
        if (keepMine)
        {
            hole.Status = HoleStatus.PROJECT;
            var r = await writer.ForceUpdateAsync(hole, user.Name, ct);
            if (r.Outcome != WriteOutcome.Written) return r;
        }
        await repo.DeleteAsync(stagingId, user.Name, ct);
        await audit.WriteAsync(new[] { new AuditEntry("ACQUIRE", hole.HoleId, hole.HoleId, keepMine ? "resolve-keep-mine" : "resolve-keep-acquire", null, null, null, user.Name) }, ct);
        return WriteResult.Ok;
    }
}
