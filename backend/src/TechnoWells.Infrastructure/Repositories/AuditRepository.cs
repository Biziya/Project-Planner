using System.Data;
using Dapper;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Options;
using TechnoWells.Core.Model;
using TechnoWells.Core.Validation;

namespace TechnoWells.Infrastructure.Repositories;

// =====================================================================
// Audit log (N-06)
// =====================================================================
public sealed class AuditRepository(SqlConnections db) : IAuditRepository
{
    public async Task WriteAsync(IEnumerable<AuditEntry> entries, CancellationToken ct = default)
    {
        var list = entries.ToList();
        if (list.Count == 0) return;
        await using var cn = db.Staging();
        await cn.ExecuteAsync(new CommandDefinition(
            "INSERT INTO stg.AUDIT_LOG (entity, entity_id, holeid, action, field, old_value, new_value, user_name) " +
            "VALUES (@Entity, @EntityId, @HoleId, @Action, @Field, @OldValue, @NewValue, @User)", list, cancellationToken: ct));
    }
}
