using TechnoWells.Core.Model;
using TechnoWells.Core.Validation;

namespace TechnoWells.Core.Repositories.Interfaces;

/// <summary>
/// The load path to acQuire (spec 10). The implementation must reserve the HOLEID and write in one step,
/// and compare versions for updates. The concrete path (importer, API, staging table) is an open point.
/// </summary>
public interface IAcquireWriteRepository
{
    /// <summary>Creates a new hole with status PROJECT. Conflict when the HOLEID already exists.</summary>
    Task<WriteResult> CreateAsync(Hole hole, string user, CancellationToken ct = default);
    /// <summary>Updates a hole when its acQuire version still equals <paramref name="expectedVersion"/>.</summary>
    Task<WriteResult> UpdateAsync(Hole hole, string expectedVersion, string user, CancellationToken ct = default);
    /// <summary>Overwrites without version check (conflict resolved with "keep mine").</summary>
    Task<WriteResult> ForceUpdateAsync(Hole hole, string user, CancellationToken ct = default);
}
