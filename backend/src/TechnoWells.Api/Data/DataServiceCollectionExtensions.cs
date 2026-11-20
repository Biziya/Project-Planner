namespace TechnoWells.Api.Data;

public static class DataServiceCollectionExtensions
{
    public static IServiceCollection AddSqlDatabase(this IServiceCollection services)
    {
        services.AddSingleton<ISqlConnectionFactory, SqlConnectionFactory>();
        return services;
    }
}
