namespace TechnoWells.Api.Configuration;

/// <summary>The "Cors" section: the web addresses of the frontend that may call this API with credentials.</summary>
public sealed record CorsSettings(IReadOnlyList<string> AllowedOrigins)
{
    public const string SectionName = "Cors";
    public const string PolicyName = "frontend";

    public static CorsSettings Load(IConfiguration configuration)
    {
        var origins = configuration.GetSection($"{SectionName}:AllowedOrigins").Get<string[]>() ?? [];

        if (origins.Length == 0)
        {
            throw new InvalidOperationException("Cors:AllowedOrigins must list at least one frontend address.");
        }

        foreach (var origin in origins)
        {
            var isAbsoluteHttp = Uri.TryCreate(origin, UriKind.Absolute, out var uri)
                && (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps);

            if (!isAbsoluteHttp || origin.Contains('*'))
            {
                throw new InvalidOperationException(
                    $"Cors:AllowedOrigins entry '{origin}' must be a full http(s) address without wildcards, e.g. 'https://technowells.example.local'.");
            }
        }

        return new CorsSettings(origins.Select(o => o.TrimEnd('/')).ToArray());
    }
}
