using TechnoWells.Infrastructure;
using System.Data;
using Dapper;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Options;
using TechnoWells.Core.Model;

namespace TechnoWells.Infrastructure.Repositories;

/// <summary>
/// Writes to acQuire through the configured load path (spec 10). Each write:
/// takes an application lock on the HOLEID (sp_getapplock), checks existence or version, writes, commits.
/// Two users sending the same HOLEID: the second waits for the lock, then gets a conflict (D-06, AT-05).
/// </summary>
public sealed class AcquireWriteRepository(SqlConnections db, IOptions<AcquireSqlOptions> options, AcquireReadRepository reader) : IAcquireWriteRepository
{
    private AcquireSqlOptions Sql => options.Value;

    public Task<WriteResult> CreateAsync(Hole hole, string user, CancellationToken ct = default) =>
        InLockAsync(hole.HoleId, async (cn, tx) =>
        {
            if (await cn.ExecuteScalarAsync<int>(new CommandDefinition(Sql.HoleExists, new { hole.HoleId }, tx, cancellationToken: ct)) == 1)
                return new WriteResult(WriteOutcome.Conflict, $"HOLEID {hole.HoleId} already exists in acQuire.", await reader.ReadAsync(cn, tx, hole.HoleId, ct));
            await cn.ExecuteAsync(new CommandDefinition(Sql.InsertLocation, LocationParams(hole), tx, cancellationToken: ct));
            await WriteRestAsync(cn, tx, hole, ct);
            return WriteResult.Ok;
        }, ct);

    public Task<WriteResult> UpdateAsync(Hole hole, string expectedVersion, string user, CancellationToken ct = default) =>
        InLockAsync(hole.HoleId, async (cn, tx) =>
        {
            var current = await reader.ReadAsync(cn, tx, hole.HoleId, ct);
            if (current is null) return new WriteResult(WriteOutcome.Refused, $"Hole {hole.HoleId} is not in acQuire.");
            if (!string.IsNullOrWhiteSpace(Sql.HoleVersion) && current.AcquireVersion != expectedVersion)
                return new WriteResult(WriteOutcome.Conflict, "This hole changed in acQuire since you opened it.", current);
            await cn.ExecuteAsync(new CommandDefinition(Sql.UpdateLocation, LocationParams(hole), tx, cancellationToken: ct));
            await WriteRestAsync(cn, tx, hole, ct);
            return WriteResult.Ok;
        }, ct);

    public Task<WriteResult> ForceUpdateAsync(Hole hole, string user, CancellationToken ct = default) =>
        InLockAsync(hole.HoleId, async (cn, tx) =>
        {
            var exists = await cn.ExecuteScalarAsync<int>(new CommandDefinition(Sql.HoleExists, new { hole.HoleId }, tx, cancellationToken: ct)) == 1;
            await cn.ExecuteAsync(new CommandDefinition(exists ? Sql.UpdateLocation : Sql.InsertLocation, LocationParams(hole), tx, cancellationToken: ct));
            await WriteRestAsync(cn, tx, hole, ct);
            return WriteResult.Ok;
        }, ct);

    /// <summary>Parameters of InsertLocation / UpdateLocation. @Grid = grid of the coordinate set
    /// (UTM_Z49N_Planned → UTM_Z49N), for HOLELOCATION.GRIDNAME.</summary>
    private static object LocationParams(Hole h) => new
    {
        h.HoleId, h.ProjectCode, h.Prospect, h.TenementId,
        Grid = string.IsNullOrWhiteSpace(h.CoordinateSet) ? null : CoordinateSets.GridOf(h.CoordinateSet)
    };

    private async Task WriteRestAsync(SqlConnection cn, SqlTransaction tx, Hole hole, CancellationToken ct)
    {
        // Every acQuire table is linked to the collar by HOLEID + PROJECTCODE: @ProjectCode goes to every write.
        await cn.ExecuteAsync(new CommandDefinition(Sql.UpsertCoord,
            new { hole.HoleId, hole.ProjectCode, hole.CoordinateSet, hole.X, hole.Y, hole.Z }, tx, cancellationToken: ct));
        foreach (var a in AcquireMapping.ToAttributes(hole))
            await cn.ExecuteAsync(new CommandDefinition(Sql.UpsertAttribute,
                new { hole.HoleId, hole.ProjectCode, TableName = a.Table, a.Name, a.Value }, tx, cancellationToken: ct));
        await cn.ExecuteAsync(new CommandDefinition(Sql.DeletePlannedGtn, new { hole.HoleId, hole.ProjectCode }, tx, cancellationToken: ct));
        foreach (var g in AcquireMapping.ToGeoAttributes(hole))
            await cn.ExecuteAsync(new CommandDefinition(Sql.InsertGtn,
                new { hole.HoleId, hole.ProjectCode, GeolFrom = g.From, GeolTo = g.To, g.Name, g.Value, g.Priority }, tx, cancellationToken: ct));
    }

    private async Task<WriteResult> InLockAsync(string holeId, Func<SqlConnection, SqlTransaction, Task<WriteResult>> work, CancellationToken ct)
    {
        if (!Sql.WritesConfigured)
            return new WriteResult(WriteOutcome.Refused,
                "Writing to acQuire is not configured yet (AcquireSql write statements). Use the current importer until the load path is agreed (B-08).");

        await using var cn = db.Acquire();
        await cn.OpenAsync(ct);
        await using var tx = (SqlTransaction)await cn.BeginTransactionAsync(IsolationLevel.ReadCommitted, ct);
        var p = new DynamicParameters();
        p.Add("@Resource", "TechnoWells:HOLEID:" + holeId.ToUpperInvariant());
        p.Add("@LockMode", "Exclusive");
        p.Add("@LockOwner", "Transaction");
        p.Add("@LockTimeout", 15000);
        p.Add("@Result", dbType: DbType.Int32, direction: ParameterDirection.ReturnValue);
        await cn.ExecuteAsync(new CommandDefinition("sp_getapplock", p, tx, commandType: CommandType.StoredProcedure, cancellationToken: ct));
        if (p.Get<int>("@Result") < 0)
            return new WriteResult(WriteOutcome.Refused, $"HOLEID {holeId} is being written by another user; try again.");
        try
        {
            var result = await work(cn, tx);
            if (result.Outcome == WriteOutcome.Written) await tx.CommitAsync(ct);
            else await tx.RollbackAsync(ct);
            return result;
        }
        catch
        {
            await tx.RollbackAsync(ct);
            throw;
        }
    }
}
