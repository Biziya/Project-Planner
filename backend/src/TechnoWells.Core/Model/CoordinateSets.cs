namespace TechnoWells.Core.Model;

/// <summary>
/// acQuire coordinate set names hold the grid and the measurement method, e.g. UTM_Z49N_Planned,
/// UTM_Z49N_Surveyed, UTM_Z49N_Pegged. Proximity checks (V-10, V-13) compare a planned hole with the other holes
/// in ALL coordinate sets of the same grid, whatever their method.
/// </summary>
public static class CoordinateSets
{
    /// <summary>Grid part of a coordinate set: "UTM_Z49N_Planned" → "UTM_Z49N". A name without "_" is its own grid.</summary>
    public static string GridOf(string coordinateSet)
    {
        var name = coordinateSet.Trim();
        var i = name.LastIndexOf('_');
        return i > 0 ? name[..i] : name;
    }

    public static bool SameGrid(string? a, string? b) =>
        a is not null && b is not null && string.Equals(GridOf(a), GridOf(b), StringComparison.OrdinalIgnoreCase);
}
