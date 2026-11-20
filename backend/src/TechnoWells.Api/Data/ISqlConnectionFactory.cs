using System.Data.Common;

namespace TechnoWells.Api.Data;

/// <summary>Opens connections to the TechnoWells SQL Server database. Repositories use it with Dapper.</summary>
public interface ISqlConnectionFactory
{
    /// <summary>True when ConnectionStrings:TechnoWells is set.</summary>
    bool IsConfigured { get; }

    /// <summary>Opens a new connection. The caller disposes it (use <c>await using</c>).</summary>
    Task<DbConnection> OpenAsync(CancellationToken cancellationToken);
}
