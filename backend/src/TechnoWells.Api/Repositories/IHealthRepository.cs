using TechnoWells.Api.Models.Health;

namespace TechnoWells.Api.Repositories;

public interface IHealthRepository
{
    Task<DatabaseState> CheckDatabaseAsync(CancellationToken cancellationToken);
}
