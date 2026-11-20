using TechnoWells.Core.HoleIds;
using TechnoWells.Core.Model;
using TechnoWells.Core.Validation;
using TechnoWells.Core.Workflow;

namespace TechnoWells.Core.Services;

// =====================================================================
// Import Program: holes in Preparation
// =====================================================================
public sealed class StagingService(IStagingRepository repo, ValidationDependencies v, IAuditRepository audit, ICurrentUser user)
{
    public async Task<IReadOnlyList<StagedHole>> ListAsync(CancellationToken ct = default)
    {
        var holes = await repo.ListAsync(ct);
        var engine = v.Engine(holes.Select(h => h.HoleId).ToList());
        return holes.Select(h => new StagedHole(h, engine.Validate(h))).ToList();
    }

    public async Task<StagedHole?> GetAsync(Guid id, CancellationToken ct = default)
    {
        var hole = await repo.GetAsync(id, ct);
        return hole is null ? null : new StagedHole(hole, v.Engine().Validate(hole));
    }

    /// <summary>Saves a draft (F-04 on Import Program). Errors do not block saving a draft, only sending.</summary>
    public async Task<StagedHole> SaveAsync(Hole hole, CancellationToken ct = default)
    {
        hole.Status = HoleStatus.Preparation;
        if (hole.Source == "acquire") hole.Source = "form";
        v.Parser.ApplyTo(hole);
        var issues = v.Engine().Validate(hole);
        var saved = await repo.SaveAsync(hole, issues.Count(i => i.Level == IssueLevel.Error), issues.Count(i => i.Level == IssueLevel.Warning), user.Name, ct);
        await audit.WriteAsync(new[] { new AuditEntry("STG_COLLAR", saved.StagingId?.ToString(), saved.HoleId, hole.StagingId is null ? "create" : "update", null, null, null, user.Name) }, ct);
        return new StagedHole(saved, issues);
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct = default)
    {
        await repo.DeleteAsync(id, user.Name, ct);
        await audit.WriteAsync(new[] { new AuditEntry("STG_COLLAR", id.ToString(), null, "delete", null, null, null, user.Name) }, ct);
    }
}
