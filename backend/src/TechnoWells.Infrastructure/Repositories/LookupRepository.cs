using TechnoWells.Infrastructure;
using System.Data;
using Dapper;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Options;
using TechnoWells.Core.Model;
using TechnoWells.Core.Validation;

namespace TechnoWells.Infrastructure.Repositories;

// =====================================================================
// Lookups: stg.v_LOOKUP, cached (L-03)
// =====================================================================
public sealed class LookupRepository(SqlConnections db, IOptions<AcquireSqlOptions> options) : ILookupRepository
{
    private readonly object _gate = new();
    private Dictionary<string, List<LookupItem>> _cache = new();
    private DateTime _loadedAt = DateTime.MinValue;

    private sealed record Row(string LOOKUP_ID, string CODE, string? DESCRIPTION, string? PARENT);

    private Dictionary<string, List<LookupItem>> Data()
    {
        lock (_gate)
        {
            if (DateTime.UtcNow - _loadedAt < TimeSpan.FromMinutes(options.Value.LookupCacheMinutes)) return _cache;
            try
            {
                using var cn = db.Staging();
                var rows = cn.Query<Row>("SELECT LOOKUP_ID, CODE, DESCRIPTION, PARENT FROM stg.v_LOOKUP");
                _cache = rows.GroupBy(r => r.LOOKUP_ID)
                    .ToDictionary(g => g.Key, g => g.Select(r => new LookupItem(r.CODE, r.DESCRIPTION ?? r.CODE, r.PARENT)).ToList());
                _loadedAt = DateTime.UtcNow;
            }
            catch when (_cache.Count > 0)
            {
                // acQuire slow or down: keep serving the last lists (N-04)
            }
            return _cache;
        }
    }

    public IReadOnlyList<LookupItem> Get(string lookupId, string? parent = null) =>
        Data().TryGetValue(lookupId, out var l) ? l.Where(i => parent is null || i.Parent is null || i.Parent == parent).ToList() : Array.Empty<LookupItem>();

    public bool IsAvailable(string lookupId) => Data().ContainsKey(lookupId);

    public bool Exists(string lookupId, string code, string? parent = null) =>
        Get(lookupId).Any(i => string.Equals(i.Code, code, StringComparison.OrdinalIgnoreCase)
                               && (parent is null || i.Parent is null || string.Equals(i.Parent, parent, StringComparison.OrdinalIgnoreCase)));
}
