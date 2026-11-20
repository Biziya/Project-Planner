using TechnoWells.Core.Model;

namespace TechnoWells.Core.Workflow;

public sealed record TransitionCheck(bool Allowed, string? Reason)
{
    public static readonly TransitionCheck Ok = new(true, null);
    public static TransitionCheck No(string reason) => new(false, reason);
}

/// <summary>Status transitions (spec 2.2). Only "Validate for drilling" needs the Supervisor role.</summary>
public static class StatusRules
{
    private static readonly HashSet<(HoleStatus From, HoleStatus To)> Allowed = new()
    {
        (HoleStatus.Preparation, HoleStatus.PROJECT),                 // send to acQuire
        (HoleStatus.PROJECT, HoleStatus.PROGRAM_TOVALIDATE),
        (HoleStatus.PROGRAM_TOVALIDATE, HoleStatus.PROJECT),
        (HoleStatus.PROGRAM_TOVALIDATE, HoleStatus.PROGRAM_VALIDATED), // supervisors only
        (HoleStatus.PROGRAM_VALIDATED, HoleStatus.PROJECT),           // roll back to picket
        (HoleStatus.PROJECT, HoleStatus.FAILED),
        (HoleStatus.PROGRAM_TOVALIDATE, HoleStatus.FAILED),
        (HoleStatus.PROGRAM_VALIDATED, HoleStatus.FAILED),
    };

    public static TransitionCheck CanChange(HoleStatus from, HoleStatus to, bool isSupervisor)
    {
        if (from == to) return TransitionCheck.Ok;
        if (!Allowed.Contains((from, to)))
            return TransitionCheck.No($"A hole cannot go from {from} to {to}.");
        if (to == HoleStatus.PROGRAM_VALIDATED && !isSupervisor)
            return TransitionCheck.No("Only supervisors can validate for drilling.");
        return TransitionCheck.Ok;
    }

    /// <summary>Holes in these statuses can be edited in the app (X-04).</summary>
    public static bool IsEditable(HoleStatus status) =>
        status is HoleStatus.Preparation or HoleStatus.PROJECT or HoleStatus.PROGRAM_TOVALIDATE;

    /// <summary>Fields locked once a hole is in acQuire (configurable list; spec 2.2).</summary>
    public static readonly IReadOnlySet<string> LockedAfterImport =
        new HashSet<string>(StringComparer.OrdinalIgnoreCase) { nameof(Hole.HoleId), nameof(Hole.ProjectCode), nameof(Hole.CoordinateSet) };
}
