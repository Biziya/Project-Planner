using TechnoWells.Api.Configuration;

namespace TechnoWells.Api.Auth;

public sealed class CurrentUser(IHttpContextAccessor httpContextAccessor, AuthSettings settings) : ICurrentUser
{
    public string Name =>
        User.Identity?.IsAuthenticated == true && !string.IsNullOrWhiteSpace(User.Identity.Name)
            ? User.Identity.Name
            : throw new InvalidOperationException("No signed-in user. Is [Authorize] missing on this endpoint?");

    public bool IsSupervisor => User.IsInRole(settings.SupervisorRole);

    private System.Security.Claims.ClaimsPrincipal User =>
        httpContextAccessor.HttpContext?.User
        ?? throw new InvalidOperationException("The current user is only available during a request.");
}
