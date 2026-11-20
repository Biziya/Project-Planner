using TechnoWells.Core.Model;
using TechnoWells.Core.Validation;

namespace TechnoWells.Core.Repositories.Interfaces;

/// <summary>Holes in Preparation (STG_HOLE + STG_GEODETAILS).</summary>
public interface IStagingRepository
{
    Task<IReadOnlyList<Hole>> ListAsync(CancellationToken ct = default);
    Task<Hole?> GetAsync(Guid stagingId, CancellationToken ct = default);
    Task<Hole?> FindByHoleIdAsync(string holeId, CancellationToken ct = default);
    /// <summary>Insert or update. Throws <see cref="ConcurrencyException"/> when RowVersion is stale.</summary>
    Task<Hole> SaveAsync(Hole hole, int errorCount, int warningCount, string user, CancellationToken ct = default);
    Task DeleteAsync(Guid stagingId, string user, CancellationToken ct = default);
    /// <summary>Highest numeric KEY among the drafts, or null when there is none.</summary>
    Task<long?> MaxKeyAsync(CancellationToken ct = default);
}
