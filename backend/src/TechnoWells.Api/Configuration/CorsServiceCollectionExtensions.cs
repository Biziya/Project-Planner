namespace TechnoWells.Api.Configuration;

public static class CorsServiceCollectionExtensions
{
    /// <summary>The frontend is a separate site, so it needs CORS with credentials (Windows sign-in cookies/tickets).</summary>
    public static IServiceCollection AddAppCors(this IServiceCollection services, CorsSettings settings)
    {
        services.AddCors(options => options.AddPolicy(CorsSettings.PolicyName, policy => policy
            .WithOrigins([.. settings.AllowedOrigins])
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials()));

        return services;
    }
}
