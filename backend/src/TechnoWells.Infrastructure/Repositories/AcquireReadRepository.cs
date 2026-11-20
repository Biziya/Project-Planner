using TechnoWells.Infrastructure;
using System.Data;
using Dapper;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Options;
using TechnoWells.Core.Model;

namespace TechnoWells.Infrastructure.Repositories;

/// <summary>Reads holes from acQuire with the SQL of <see cref="AcquireSqlOptions"/>.</summary>
public sealed class AcquireReadRepository(SqlConnections db, IOptions<AcquireSqlOptions> options) : IAcquireReadRepository
{
    private AcquireSqlOptions Sql => options.Value;

    private sealed record SummaryRow(string HoleId, string Status, string? ProjectCode, string? Prospect, string? HolePurpose, string? HolePlanTarget, decimal? X, decimal? Y, decimal? Z);
    private sealed record ColumnsRow(string HoleId, string? ProjectCode, string? Prospect, string? TenementId, string? CoordinateSet, decimal? X, decimal? Y, decimal? Z);
    private sealed record AttrRow(string TableName, string Name, string? Value);
    private sealed record GeoRow(decimal GeolFrom, decimal GeolTo, string Name, string? Value, int? Priority);

    public async Task<IReadOnlyList<HoleSummary>> ListProgramHolesAsync(HoleFilter f, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(Sql.ListProgramHoles))
            throw new InvalidOperationException("Configure AcquireSql:ListProgramHoles (holes in PROJECT / PROGRAM_TOVALIDATE).");
        await using var cn = db.Acquire();
        var rows = await cn.QueryAsync<SummaryRow>(new CommandDefinition(Sql.ListProgramHoles, new
        {
            Search = string.IsNullOrWhiteSpace(f.Search) ? null : f.Search, Status = f.Status?.ToString(),
            Project = f.ProjectCode, f.Prospect, f.Purpose, f.Target
        }, cancellationToken: ct));
        return rows.Select(r => new HoleSummary(r.HoleId, Enum.TryParse<HoleStatus>(r.Status, out var s) ? s : HoleStatus.PROJECT,
            r.ProjectCode, r.Prospect, r.HolePurpose, r.HolePlanTarget, r.X, r.Y, r.Z)).ToList();
    }

    public async Task<Hole?> GetHoleAsync(string holeId, CancellationToken ct = default)
    {
        await using var cn = db.Acquire();
        await cn.OpenAsync(ct);
        return await ReadAsync(cn, null, holeId, ct);
    }

    public async Task<(bool Available, long? Max)> MaxKeyAsync(CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(Sql.MaxKey)) return (false, null);
        await using var cn = db.Acquire();
        return (true, await cn.ExecuteScalarAsync<long?>(new CommandDefinition(Sql.MaxKey, cancellationToken: ct)));
    }

    /// <summary>Reads a hole on an open connection (used inside the writer's transaction too).</summary>
    internal async Task<Hole?> ReadAsync(SqlConnection cn, SqlTransaction? tx, string holeId, CancellationToken ct)
    {
        var cols = await cn.QuerySingleOrDefaultAsync<ColumnsRow>(new CommandDefinition(Sql.HoleColumns, new { HoleId = holeId }, tx, cancellationToken: ct));
        if (cols is null) return null;
        var hole = new Hole
        {
            HoleId = cols.HoleId, ProjectCode = cols.ProjectCode, Prospect = cols.Prospect, TenementId = cols.TenementId,
            CoordinateSet = cols.CoordinateSet, X = cols.X, Y = cols.Y, Z = cols.Z, Source = "acquire", Status = HoleStatus.PROJECT
        };
        if (!string.IsNullOrWhiteSpace(Sql.HoleAttributes))
        {
            var attrs = await cn.QueryAsync<AttrRow>(new CommandDefinition(Sql.HoleAttributes, new { HoleId = holeId }, tx, cancellationToken: ct));
            AcquireMapping.FromAttributes(hole, attrs.Select(a => new AcquireAttribute(a.TableName, a.Name, a.Value)));
        }
        if (!string.IsNullOrWhiteSpace(Sql.HoleGtn))
        {
            var geo = await cn.QueryAsync<GeoRow>(new CommandDefinition(Sql.HoleGtn, new { HoleId = holeId }, tx, cancellationToken: ct));
            hole.Gtn = AcquireMapping.FromGeoAttributes(geo.Select(g => new AcquireGeoAttribute(g.GeolFrom, g.GeolTo, g.Name, g.Value, g.Priority ?? AcquireMapping.GtnPriority)));
        }
        hole.AcquireVersion = string.IsNullOrWhiteSpace(Sql.HoleVersion)
            ? null
            : await cn.ExecuteScalarAsync<string?>(new CommandDefinition(Sql.HoleVersion, new { HoleId = holeId }, tx, cancellationToken: ct));
        return hole;
    }
}
