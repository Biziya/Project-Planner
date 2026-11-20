namespace TechnoWells.Api.Repositories;

public static class RepositoryServiceCollectionExtensions
{
    /// <summary>Register every repository here: interface → Dapper implementation.</summary>
    public static IServiceCollection AddRepositories(this IServiceCollection services)
    {
        services.AddScoped<IHealthRepository, HealthRepository>();
        return services;
    }
}
