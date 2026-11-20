using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace TechnoWells.Api.Controllers;

/// <summary>Base for every controller: JSON API under /api, signed-in users only.</summary>
[ApiController]
[Authorize]
[Route("api/[controller]")]
public abstract class ApiControllerBase : ControllerBase;
