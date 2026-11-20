using System.Text.RegularExpressions;
using TechnoWells.Core.Model;

namespace TechnoWells.Core.HoleIds;

/// <summary>Parts of a HOLEID, e.g. IZO_446_054_44_A_ (spec 6.1).</summary>
public sealed record HoleIdParts(
    string SubPurposeLetter,   // P, I, U, M
    string ProjectLetters,     // ZO, DU…
    string EastingColumnHexa,  // 446
    string NorthingRowHexa,    // 054
    string DepthBin,           // 44_A
    string BisNumber)          // "_" or 2–5
{
    public string Prefix => SubPurposeLetter + ProjectLetters;

    /// <summary>HOLEID without its bis number: two holes with the same root are re-drillings.</summary>
    public string Root => $"{Prefix}_{EastingColumnHexa}_{NorthingRowHexa}_{DepthBin}";
}

public sealed class HoleIdOptions
{
    /// <summary>Full pattern; named groups letter, project, east, north, bin, bis. Confirm on real HOLEIDs.</summary>
    public string Pattern { get; set; } =
        @"^(?<letter>[PIUM])(?<project>[A-Z]{2})_(?<east>\d{3})_(?<north>\d{3})_(?<bin>\d{2}_[A-Z])(?<bis>_|[2-5])$";

    /// <summary>Project letters in the HOLEID → PROJECTCODE.</summary>
    public Dictionary<string, string> ProjectCodes { get; set; } = new()
    {
        ["ZO"] = "ZOOVCH",
        ["DU"] = "DULAAN UUL"
    };

    /// <summary>Letters refused because they are not drillholes (cells, blocks).</summary>
    public string[] RefusedLetters { get; set; } = { "C", "B" };
}

public sealed class HoleIdParser
{
    private readonly HoleIdOptions _options;
    private readonly Regex _regex;

    public HoleIdParser(HoleIdOptions? options = null)
    {
        _options = options ?? new HoleIdOptions();
        _regex = new Regex(_options.Pattern, RegexOptions.CultureInvariant | RegexOptions.Compiled);
    }

    public HoleIdOptions Options => _options;

    /// <summary>Returns the parts, or null with a reason when the HOLEID does not match.</summary>
    public HoleIdParts? TryParse(string? holeId, out string? error)
    {
        error = null;
        var value = (holeId ?? "").Trim().ToUpperInvariant();
        if (value.Length == 0)
        {
            error = "HOLEID is empty.";
            return null;
        }
        if (_options.RefusedLetters.Contains(value[..1]))
        {
            error = $"HOLEID starts with {value[0]}: cells and blocks are not drillholes.";
            return null;
        }
        var m = _regex.Match(value);
        if (!m.Success)
        {
            error = $"HOLEID {value} does not follow the pattern PPP_111_222_33_A_ (e.g. IZO_446_054_44_A_).";
            return null;
        }
        return new HoleIdParts(
            m.Groups["letter"].Value,
            m.Groups["project"].Value,
            m.Groups["east"].Value,
            m.Groups["north"].Value,
            m.Groups["bin"].Value,
            m.Groups["bis"].Value);
    }

    /// <summary>Fills the auto fields of a hole from its HOLEID (F-03). Returns false if the HOLEID is invalid.</summary>
    public bool ApplyTo(Hole hole)
    {
        var parts = TryParse(hole.HoleId, out _);
        if (parts is null) return false;
        hole.HoleId = hole.HoleId.Trim().ToUpperInvariant();
        hole.HolePrefix = parts.Prefix;
        hole.EastingColumnHexa = parts.EastingColumnHexa;
        hole.NorthingRowHexa = parts.NorthingRowHexa;
        hole.DepthBin = parts.DepthBin;
        hole.BisNumber = parts.BisNumber;
        if (string.IsNullOrEmpty(hole.ProjectCode) && _options.ProjectCodes.TryGetValue(parts.ProjectLetters, out var code))
            hole.ProjectCode = code;
        return true;
    }

    /// <summary>Root of a HOLEID (without bis number), or null when it does not parse.</summary>
    public string? RootOf(string? holeId) => TryParse(holeId, out _)?.Root;
}
