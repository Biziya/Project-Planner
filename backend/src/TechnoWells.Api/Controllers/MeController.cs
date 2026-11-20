using Microsoft.AspNetCore.Mvc;
using TechnoWells.Api.Auth;
using TechnoWells.Api.Models.Me;

namespace TechnoWells.Api.Controllers;

public sealed class MeController(ICurrentUser currentUser) : ApiControllerBase
{
    /// <summary>GET /api/me — who the server says you are.</summary>
    [HttpGet]
    public MeResponse Get() => new(currentUser.Name, currentUser.IsSupervisor);
}
