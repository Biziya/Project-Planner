using TechnoWells.Core.Model;
using TechnoWells.Core.Validation;

namespace TechnoWells.Core.Repositories.Interfaces;

/// <summary>Lookups (spec 5.4), read from stg.v_LOOKUP and cached.</summary>
public interface ILookupRepository : ILookupProvider
{
    IReadOnlyList<LookupItem> Get(string lookupId, string? parent = null);
}
