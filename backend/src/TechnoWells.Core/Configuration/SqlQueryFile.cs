using System.Reflection;
using System.Text.RegularExpressions;

namespace TechnoWells.Core.Configuration;

/// <summary>
/// Reads named SQL queries from a .sql file, so long queries can be written, commented and tested in SSMS
/// instead of being squeezed on one line of appsettings.json.
/// Each query starts with a line "-- @query Name" and ends at the next "-- @query" line or at the end of the file.
/// Text before the first marker (header, test parameters) is ignored.
/// </summary>
public static partial class SqlQueryFile
{
    [GeneratedRegex(@"^\s*--\s*@query\s+(\w+)\s*$", RegexOptions.Multiline)]
    private static partial Regex Marker();

    public static Dictionary<string, string> Parse(string text)
    {
        var result = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        var matches = Marker().Matches(text);
        for (var i = 0; i < matches.Count; i++)
        {
            var start = matches[i].Index + matches[i].Length;
            var end = i + 1 < matches.Count ? matches[i + 1].Index : text.Length;
            result[matches[i].Groups[1].Value] = text[start..end].Trim();
        }
        return result;
    }

    /// <summary>
    /// Copies each non-empty query to the string property of the same name on <paramref name="options"/>.
    /// An unknown name stops the start-up with a clear message (typo protection).
    /// </summary>
    public static void ApplyTo(object options, IReadOnlyDictionary<string, string> queries, string source)
    {
        foreach (var (name, sql) in queries)
        {
            var prop = options.GetType().GetProperty(name, BindingFlags.Public | BindingFlags.Instance | BindingFlags.IgnoreCase);
            if (prop is null || prop.PropertyType != typeof(string) || !prop.CanWrite)
                throw new InvalidOperationException($"{source}: unknown query name \"{name}\".");
            if (!string.IsNullOrWhiteSpace(StripComments(sql))) prop.SetValue(options, sql);
        }
    }

    /// <summary>True when the text holds SQL, not only comments.</summary>
    private static string StripComments(string sql) =>
        Regex.Replace(Regex.Replace(sql, @"/\*.*?\*/", "", RegexOptions.Singleline), @"--[^\n]*", "").Trim();
}
