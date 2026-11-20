using Dapper;
using Microsoft.Data.SqlClient;
using TechnoWells.Api.Data;
using TechnoWells.Api.Models.Health;

namespace TechnoWells.Api.Repositories;

/// <summary>The smallest example of the repository pattern: Dapper over a connection from the factory.</summary>
public sealed class HealthRepository(ISqlConnectionFactory connections, ILogger<HealthRepository> logger) : IHealthRepository
{
    private const string PingSql = "SELECT 1;";

    public async Task<DatabaseState> CheckDatabaseAsync(CancellationToken cancellationToken)
    {
        if (!connections.IsConfigured)
        {
            return DatabaseState.NotConfigured;
        }

        try
        {
            await using var connection = await connections.OpenAsync(cancellationToken);
            await connection.ExecuteScalarAsync<int>(new CommandDefinition(PingSql, cancellationToken: cancellationToken));
            return DatabaseState.Ok;
        }
        catch (SqlException ex)
        {
            logger.LogWarning(ex, "Database health check failed.");
            return DatabaseState.Unreachable;
        }
    }
}
