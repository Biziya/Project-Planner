using System.Data;
using Dapper;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Options;
using TechnoWells.Core.Model;
using TechnoWells.Core.Validation;

namespace TechnoWells.Infrastructure.Repositories;

public sealed class SqlConnections(IConfiguration config)
{
    public SqlConnection Staging() => new(config.GetConnectionString("Staging") ?? throw new InvalidOperationException("ConnectionStrings:Staging is missing."));
    public SqlConnection Acquire() => new(config.GetConnectionString("Acquire") ?? throw new InvalidOperationException("ConnectionStrings:Acquire is missing."));
}
