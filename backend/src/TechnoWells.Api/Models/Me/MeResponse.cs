namespace TechnoWells.Api.Models.Me;

/// <summary>Matches the frontend's <c>Me</c> type.</summary>
public sealed record MeResponse(string Name, bool IsSupervisor);
