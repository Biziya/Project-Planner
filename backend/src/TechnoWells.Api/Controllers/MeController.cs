using Microsoft.AspNetCore.Mvc;

namespace TechnoWells.Api.Controllers;

[Route("api/me")]
public sealed class MeController(ICurrentUser user) : ApiControllerBase
{
    /// <summary>Signed-in user and role (Supervisor or not).</summary>
    [HttpGet]
    public IActionResult Get() => Ok(new { user.Name, user.IsSupervisor });
}
