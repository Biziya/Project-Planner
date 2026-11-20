namespace TechnoWells.Core.Services;

/// <summary>Suggested KEY = highest KEY of all holes (acQuire, any status, and drafts in staging) + 1.</summary>
public sealed record KeySuggestion(long Suggested, long? MaxInAcquire, long? MaxInStaging, bool AcquireIncluded);

/// <summary>
/// Suggests the next KEY for a new hole. The suggestion is only shown to the user as information:
/// it is never written into the hole automatically.
/// </summary>
public sealed class KeySuggestionService(IStagingRepository staging, IAcquireReadRepository acquire)
{
    public async Task<KeySuggestion> SuggestAsync(CancellationToken ct = default)
    {
        var (available, maxAcquire) = await acquire.MaxKeyAsync(ct);
        var maxStaging = await staging.MaxKeyAsync(ct);
        var max = Math.Max(maxAcquire ?? 0, maxStaging ?? 0);
        return new KeySuggestion(max + 1, maxAcquire, maxStaging, available);
    }
}
