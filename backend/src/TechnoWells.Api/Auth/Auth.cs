using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;

namespace TechnoWells.Api.Auth;

public sealed class AuthOptions
{
    /// <summary>"Windows" (IIS with Windows Authentication, Orano account) or "Dev".</summary>
    public string Mode { get; set; } = "Dev";
    /// <summary>Active Directory group of supervisors (A-02). Name to confirm.</summary>
    public string SupervisorGroup { get; set; } = @"ORANO\TechnoWells_Supervisors";
    public string DevUser { get; set; } = "dev.user";
    public bool DevIsSupervisor { get; set; } = true;
}

public sealed class HttpCurrentUser(IHttpContextAccessor http, IOptions<AuthOptions> options) : ICurrentUser
{
    private ClaimsPrincipal? User => http.HttpContext?.User;
    public string Name => User?.Identity?.Name ?? "anonymous";
    public bool IsSupervisor => User?.IsInRole(options.Value.SupervisorGroup) == true || User?.IsInRole("Supervisor") == true;
}

/// <summary>Development sign-in: a fixed user; header X-Dev-Supervisor: false simulates a non-supervisor.</summary>
public sealed class DevAuthHandler(IOptionsMonitor<AuthenticationSchemeOptions> options, ILoggerFactory logger, UrlEncoder encoder,
    IOptions<AuthOptions> auth) : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    public const string SchemeName = "Dev";

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var supervisor = auth.Value.DevIsSupervisor;
        if (Request.Headers.TryGetValue("X-Dev-Supervisor", out var h) && bool.TryParse(h, out var v)) supervisor = v;
        var claims = new List<Claim> { new(ClaimTypes.Name, auth.Value.DevUser) };
        if (supervisor) claims.Add(new Claim(ClaimTypes.Role, "Supervisor"));
        var principal = new ClaimsPrincipal(new ClaimsIdentity(claims, SchemeName));
        return Task.FromResult(AuthenticateResult.Success(new AuthenticationTicket(principal, SchemeName)));
    }
}
