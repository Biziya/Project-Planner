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
// Hole directory (V-03, V-10, V-13, V-15): staging + acQuire
// =====================================================================
public sealed class HoleDirectoryRepository(SqlConnections db, IOptions<AcquireSqlOptions> options, ValidationSettings settings) : IHoleDirectory
{
    private AcquireSqlOptions Sql => options.Value;
    private sealed record Pos(string HoleId, decimal X, decimal Y);

    public bool HoleIdExistsInAcquire(string holeId)
    {
        using var cn = db.Acquire();
        return cn.ExecuteScalar<int>(Sql.HoleExists, new { HoleId = holeId }) == 1;
    }

    public bool HoleIdExistsInStaging(string holeId, Guid? exceptStagingId)
    {
        using var cn = db.Staging();
        return cn.ExecuteScalar<int>("SELECT COUNT(*) FROM stg.STG_COLLAR WHERE holeid = @holeId AND (@except IS NULL OR stg_hole_id <> @except)",
            new { holeId, except = exceptStagingId }) > 0;
    }

    /// <summary>Positions near a point in ALL coordinate sets of the same grid (Planned, Surveyed, Pegged…).
    /// A hole can appear several times (one row per coordinate set).</summary>
    private List<Pos> Near(decimal x, decimal y, string cs, decimal radius)
    {
        var grid = CoordinateSets.GridOf(cs);
        using var st = db.Staging();
        var list = st.Query<Pos>("SELECT holeid AS HoleId, x AS X, y AS Y FROM stg.STG_COLLAR WHERE coordinateset LIKE @grid + '[_]%' " +
                                 "AND x BETWEEN @x - @r AND @x + @r AND y BETWEEN @y - @r AND @y + @r",
            new { grid, x, y, r = radius }).ToList();
        using var aq = db.Acquire();
        list.AddRange(aq.Query<Pos>(Sql.HolesNear, new { X = x, Y = y, CoordinateSet = cs, Grid = grid, Radius = radius }));
        return list;
    }

    public IEnumerable<string> HolesAt(decimal x, decimal y, string coordinateSet, string exceptHoleId) =>
        Near(x, y, coordinateSet, 0.001m).Where(p => p.X == x && p.Y == y && p.HoleId != exceptHoleId).Select(p => p.HoleId).Distinct();

    public (string HoleId, decimal Distance)? Nearest(decimal x, decimal y, string coordinateSet, string exceptHoleId)
    {
        var radius = settings.MinDistance ?? 50m;
        var best = Near(x, y, coordinateSet, radius).Where(p => p.HoleId != exceptHoleId)
            .Select(p => (p.HoleId, D: (decimal)Math.Sqrt((double)((p.X - x) * (p.X - x) + (p.Y - y) * (p.Y - y)))))
            .OrderBy(t => t.D).FirstOrDefault();
        return best.HoleId is null ? null : (best.HoleId, best.D);
    }

    public bool KeyExists(string key, string exceptHoleId)
    {
        using var st = db.Staging();
        if (st.ExecuteScalar<int>("SELECT COUNT(*) FROM stg.STG_COLLAR WHERE technowell_key = @key AND holeid <> @holeId", new { key, holeId = exceptHoleId }) > 0) return true;
        if (string.IsNullOrWhiteSpace(Sql.KeyExists)) return false;
        using var aq = db.Acquire();
        return aq.ExecuteScalar<int>(Sql.KeyExists, new { Key = key, HoleId = exceptHoleId }) == 1;
    }
}
