namespace TechnoWells.Core.Model;

/// <summary>
/// acQuire stores planned intervals in numbered attributes: PlanFromD1..D4 / PlanToD1..D4 for destructive
/// intervals and PlanFromC1..C3 / PlanToC1..C3 / PlanRecoveryC1..C3 / PlanCoredComment1..3 for core
/// intervals (spec 6.4). The UI works with rows; this class converts both ways.
/// </summary>
public static class IntervalSlots
{
    public const int MaxDestructive = 4;
    public const int MaxCore = 3;

    /// <summary>
    /// Converts rows to slot values, keyed by acQuire attribute name. Rows are numbered in depth order
    /// within their type. Unused slots are returned with a null value so they are cleared on write.
    /// Throws when a type has more rows than slots (validated beforehand by V-16).
    /// </summary>
    public static IReadOnlyDictionary<string, object?> ToSlots(IEnumerable<Interval> rows)
    {
        var list = rows.ToList();
        var destructive = list.Where(r => r.Type == IntervalType.Destructive).OrderBy(r => r.From ?? decimal.MaxValue).ToList();
        var core = list.Where(r => r.Type == IntervalType.Core).OrderBy(r => r.From ?? decimal.MaxValue).ToList();
        if (destructive.Count > MaxDestructive || core.Count > MaxCore)
            throw new InvalidOperationException($"acQuire stores up to {MaxDestructive} destructive and {MaxCore} core intervals.");

        var slots = new Dictionary<string, object?>();
        for (var n = 1; n <= MaxDestructive; n++)
        {
            var row = n <= destructive.Count ? destructive[n - 1] : null;
            slots[$"PlanFromD{n}"] = row?.From;
            slots[$"PlanToD{n}"] = row?.To;
        }
        for (var n = 1; n <= MaxCore; n++)
        {
            var row = n <= core.Count ? core[n - 1] : null;
            slots[$"PlanFromC{n}"] = row?.From;
            slots[$"PlanToC{n}"] = row?.To;
            slots[$"PlanRecoveryC{n}"] = row?.Recovery;
            slots[$"PlanCoredComment{n}"] = row?.Comment;
        }
        return slots;
    }

    /// <summary>Converts slot values back to rows sorted by depth. Empty slots are skipped.</summary>
    public static List<Interval> FromSlots(IReadOnlyDictionary<string, object?> slots)
    {
        static decimal? Dec(IReadOnlyDictionary<string, object?> s, string key) =>
            s.TryGetValue(key, out var v) && v is not null && decimal.TryParse(Convert.ToString(v, System.Globalization.CultureInfo.InvariantCulture),
                System.Globalization.NumberStyles.Number, System.Globalization.CultureInfo.InvariantCulture, out var d) ? d : null;
        static string? Str(IReadOnlyDictionary<string, object?> s, string key) =>
            s.TryGetValue(key, out var v) && v is not null && !string.IsNullOrWhiteSpace(Convert.ToString(v)) ? Convert.ToString(v) : null;

        var rows = new List<Interval>();
        for (var n = 1; n <= MaxDestructive; n++)
        {
            var from = Dec(slots, $"PlanFromD{n}");
            var to = Dec(slots, $"PlanToD{n}");
            if (from is null && to is null) continue;
            rows.Add(new Interval { Type = IntervalType.Destructive, From = from, To = to });
        }
        for (var n = 1; n <= MaxCore; n++)
        {
            var from = Dec(slots, $"PlanFromC{n}");
            var to = Dec(slots, $"PlanToC{n}");
            if (from is null && to is null) continue;
            rows.Add(new Interval
            {
                Type = IntervalType.Core,
                From = from,
                To = to,
                Recovery = Dec(slots, $"PlanRecoveryC{n}"),
                Comment = Str(slots, $"PlanCoredComment{n}")
            });
        }
        return rows.OrderBy(r => r.From ?? decimal.MaxValue).ToList();
    }
}
