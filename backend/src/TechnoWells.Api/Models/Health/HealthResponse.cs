namespace TechnoWells.Api.Models.Health;

/// <param name="Status">Always "ok" when the API answers.</param>
/// <param name="Database">"notConfigured", "ok" or "unreachable".</param>
public sealed record HealthResponse(string Status, string Database);
