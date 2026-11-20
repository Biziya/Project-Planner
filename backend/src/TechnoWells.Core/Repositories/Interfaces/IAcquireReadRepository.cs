using TechnoWells.Core.Model;
using TechnoWells.Core.Validation;

namespace TechnoWells.Core.Repositories.Interfaces;

/// <summary>Reads holes already in acQuire (PROJECT, PROGRAM_TOVALIDATE…).</summary>
public interface IAcquireReadRepository
{
    Task<IReadOnlyList<HoleSummary>> ListProgramHolesAsync(HoleFilter filter, CancellationToken ct = default);
    /// <summary>Full hole with AcquireVersion set, or null.</summary>
    Task<Hole?> GetHoleAsync(string holeId, CancellationToken ct = default);
    /// <summary>Highest numeric KEY among ALL holes in acQuire, whatever their status.
    /// Available = false when the query is not configured yet.</summary>
    Task<(bool Available, long? Max)> MaxKeyAsync(CancellationToken ct = default);
}
