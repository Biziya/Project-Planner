using TechnoWells.Core.Model;

namespace TechnoWells.Core.Validation;

public enum IssueLevel { Error, Warning }

/// <summary>One finding of the validation engine (spec 7.2).</summary>
public sealed record Issue(string HoleId, int? Row, string Field, string Rule, IssueLevel Level, string Message);

/// <summary>Lookup values (spec 5.4). Implemented by the infrastructure on top of stg.v_LOOKUP.</summary>
public interface ILookupProvider
{
    /// <summary>True when the code exists in the lookup (and belongs to the parent when one is given).</summary>
    bool Exists(string lookupId, string code, string? parent = null);

    /// <summary>True when the lookup has a source; checks on unknown lookups (TBD in the spec) are skipped.</summary>
    bool IsAvailable(string lookupId);
}

/// <summary>Other holes, in staging and in acQuire, used by uniqueness and distance checks.</summary>
public interface IHoleDirectory
{
    bool HoleIdExistsInAcquire(string holeId);
    bool HoleIdExistsInStaging(string holeId, Guid? exceptStagingId);
    /// <summary>Holes (staging + acQuire) at exactly these coordinates in this coordinate set.</summary>
    IEnumerable<string> HolesAt(decimal x, decimal y, string coordinateSet, string exceptHoleId);
    /// <summary>Nearest other hole and its distance in metres, or null when there is none.</summary>
    (string HoleId, decimal Distance)? Nearest(decimal x, decimal y, string coordinateSet, string exceptHoleId);
    bool KeyExists(string key, string exceptHoleId);
}

/// <summary>Spatial checks (grid and prospect polygons, V-05). Plug in the real implementation when polygons are available.</summary>
public interface ISpatialChecker
{
    /// <summary>Null when the point is inside the grid and the prospect; otherwise the reason.</summary>
    string? Check(decimal x, decimal y, string coordinateSet, string? prospect);
}

public sealed class NoSpatialChecker : ISpatialChecker
{
    public string? Check(decimal x, decimal y, string coordinateSet, string? prospect) => null;
}

/// <summary>Settings of the rules that are still TBD in the spec (N-07: settings, not code).</summary>
public sealed class ValidationSettings
{
    /// <summary>Default mandatory fields (spec V-01), used when <see cref="MandatoryFields"/> is empty.</summary>
    public static readonly IReadOnlyList<string> DefaultMandatoryFields = new[]
    {
        nameof(Hole.HoleId), nameof(Hole.ProjectCode), nameof(Hole.Prospect), nameof(Hole.TechnoWellKey),
        nameof(Hole.X), nameof(Hole.Y), nameof(Hole.Z), nameof(Hole.CoordinateSet),
        nameof(Hole.HolePurpose), nameof(Hole.SubPurpose), nameof(Hole.PlanDrillType), nameof(Hole.HolePlanDepth)
    };

    /// <summary>Mandatory fields (property names of <see cref="Hole"/>), V-01. Empty = defaults.
    /// Kept empty here so a list in appsettings.json replaces the defaults instead of being added to them.</summary>
    public List<string> MandatoryFields { get; set; } = new();

    public IEnumerable<string> EffectiveMandatoryFields =>
        (MandatoryFields.Count == 0 ? DefaultMandatoryFields : MandatoryFields).Distinct(StringComparer.OrdinalIgnoreCase);

    /// <summary>V-06 plausible elevation range (TBD); null disables the check.</summary>
    public decimal? ZMin { get; set; }
    public decimal? ZMax { get; set; }

    /// <summary>V-13 same X, Y as another hole (except re-drillings): Error blocks sending, Warning only informs.</summary>
    public IssueLevel SameCoordinatesLevel { get; set; } = IssueLevel.Error;

    /// <summary>V-10 minimum distance between two holes in metres (TBD); null disables the check.</summary>
    public decimal? MinDistance { get; set; }

    /// <summary>V-15 KEY must be unique (TBD).</summary>
    public bool KeyMustBeUnique { get; set; } = true;

    /// <summary>KEY must be a whole number (digits only).</summary>
    public bool KeyMustBeNumeric { get; set; } = true;

    /// <summary>Sub purpose code → HOLEID first letter (P, I, U, M), V-04. Fill when the sub purpose list is known.</summary>
    public Dictionary<string, string> SubPurposeLetters { get; set; } = new(StringComparer.OrdinalIgnoreCase);

    /// <summary>
    /// GTN panel: true = lithology and CaCO3 risk share the same intervals (each row carries both, rows must not overlap).
    /// false = fallback when the two attributes have their own intervals: a row may carry only one of them,
    /// and overlaps are checked per attribute (spec 6.5, GEODETAILS key = HOLEID + FROM + TO + attribute).
    /// </summary>
    public bool GtnSameIntervals { get; set; } = true;

    /// <summary>Maximum text length for comments (TBD).</summary>
    public int MaxCommentLength { get; set; } = 4000;
}

public sealed class ValidationContext
{
    public required ILookupProvider Lookups { get; init; }
    public required IHoleDirectory Directory { get; init; }
    public ISpatialChecker Spatial { get; init; } = new NoSpatialChecker();
    public ValidationSettings Settings { get; init; } = new();
    public HoleIds.HoleIdParser Parser { get; init; } = new();

    /// <summary>HOLEIDs of the other holes in the same batch (import file or send), V-03.</summary>
    public IReadOnlyCollection<string> BatchHoleIds { get; init; } = Array.Empty<string>();
}
