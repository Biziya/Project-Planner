using System.Data.Common;
using Microsoft.Data.SqlClient;

namespace TechnoWells.Api.Data;

public sealed class SqlConnectionFactory(IConfiguration configuration) : ISqlConnectionFactory
{
    public const string ConnectionStringName = "TechnoWells";

    private readonly string? connectionString = configuration.GetConnectionString(ConnectionStringName);

    public bool IsConfigured => !string.IsNullOrWhiteSpace(connectionString);

    public async Task<DbConnection> OpenAsync(CancellationToken cancellationToken)
    {
        if (!IsConfigured)
        {
            throw new InvalidOperationException(
                $"ConnectionStrings:{ConnectionStringName} is not set. Add it to appsettings.Development.json (see the .example file).");
        }

        var connection = new SqlConnection(connectionString);
        try
        {
            await connection.OpenAsync(cancellationToken);
            return connection;
        }
        catch
        {
            await connection.DisposeAsync();
            throw;
        }
    }
}
