using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;
using TechnoWells.Api.Configuration;

namespace TechnoWells.Api.Auth;

/// <summary>
/// Signs every request in as Auth:DevUser. Registered only when Auth:Mode is 'Dev',
/// which AuthSettings allows only in the Development environment.
/// </summary>
public sealed class DevAuthenticationHandler(
    IOptionsMonitor<AuthenticationSchemeOptions> options,
    ILoggerFactory logger,
    UrlEncoder encoder,
    AuthSettings settings)
    : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    public const string SchemeName = "Dev";

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var claims = new List<Claim> { new(ClaimTypes.Name, settings.DevUser) };
        if (settings.DevIsSupervisor)
        {
            claims.Add(new Claim(ClaimTypes.Role, AuthSettings.DevSupervisorRole));
        }

        var principal = new ClaimsPrincipal(new ClaimsIdentity(claims, SchemeName));
        return Task.FromResult(AuthenticateResult.Success(new AuthenticationTicket(principal, SchemeName)));
    }
}
