using Microsoft.AspNetCore.Mvc;
using TechnoWells.Core.Services;

namespace TechnoWells.Api.Controllers;

[Route("api/keys")]
public sealed class KeysController(KeySuggestionService keys) : ApiControllerBase
{
    /// <summary>Suggested KEY: highest KEY of all holes (acQuire, any status, and drafts) + 1. Shown as information only.</summary>
    [HttpGet("suggestion")]
    public async Task<IActionResult> Suggestion(CancellationToken ct) => Ok(await keys.SuggestAsync(ct));
}
