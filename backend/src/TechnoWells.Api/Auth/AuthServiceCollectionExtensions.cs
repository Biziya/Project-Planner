using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Negotiate;
using TechnoWells.Api.Configuration;

namespace TechnoWells.Api.Auth;

public static class AuthServiceCollectionExtensions
{
    public static IServiceCollection AddAppAuthentication(this IServiceCollection services, AuthSettings settings)
    {
        services.AddSingleton(settings);
        services.AddHttpContextAccessor();
        services.AddScoped<ICurrentUser, CurrentUser>();

        if (settings.Mode == AuthMode.Dev)
        {
            services.AddAuthentication(DevAuthenticationHandler.SchemeName)
                .AddScheme<AuthenticationSchemeOptions, DevAuthenticationHandler>(DevAuthenticationHandler.SchemeName, _ => { });
        }
        else
        {
            // Works under Kestrel and IIS. Windows groups arrive as role claims.
            services.AddAuthentication(NegotiateDefaults.AuthenticationScheme).AddNegotiate();
        }

        services.AddAuthorization();
        return services;
    }
}
