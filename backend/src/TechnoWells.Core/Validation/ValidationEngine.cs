using System.Globalization;
using TechnoWells.Core.Model;

namespace TechnoWells.Core.Validation;

/// <summary>Runs rules V-01 to V-17 (spec 7.1). Errors block sending; warnings must be confirmed.</summary>
public sealed class ValidationEngine
{
    /// <summary>UI labels used in messages, by property name.</summary>
    public static readonly IReadOnlyDictionary<string, string> Labels = new Dictionary<string, string>
    {
        [nameof(Hole.HoleId)] = "HOLEID", [nameof(Hole.ProjectCode)] = "Project", [nameof(Hole.Prospect)] = "Campaign",
        [nameof(Hole.TenementId)] = "Tenement", [nameof(Hole.Status)] = "Status", [nameof(Hole.FailureComment)] = "Failure comment",
        [nameof(Hole.TechnoWellKey)] = "KEY", [nameof(Hole.X)] = "X", [nameof(Hole.Y)] = "Y", [nameof(Hole.Z)] = "Z",
        [nameof(Hole.CoordinateSet)] = "Coordinate system", [nameof(Hole.Azimuth)] = "Azimuth", [nameof(Hole.Dip)] = "Dip",
        [nameof(Hole.HolePurpose)] = "Purpose", [nameof(Hole.SubPurpose)] = "Sub purpose", [nameof(Hole.HolePlanTarget)] = "Target",
        [nameof(Hole.HolePlanDate)] = "Start date", [nameof(Hole.PlanDrillType)] = "Planned drill type",
        [nameof(Hole.HolePlanDepth)] = "Planned depth", [nameof(Hole.MaxDeviation)] = "Max deviation",
        [nameof(Hole.ChiefGeologist)] = "Supervisor (chief geologist)", [nameof(Hole.TechnicGeologist)] = "Technic geologist",
        [nameof(Hole.DrillMaster)] = "Drill master", [nameof(Hole.DrillRig)] = "Drill rig", [nameof(Hole.DrillCompany)] = "Drill company",
        [nameof(Hole.MudPlugFrom)] = "Mud plug top", [nameof(Hole.MudPlugTo)] = "Mud plug bottom",
        [nameof(Hole.ScreenTop)] = "Screen top", [nameof(Hole.ScreenBottom)] = "Screen bottom",
    };

    /// <summary>Coded fields: property → (lookup id, parent property).</summary>
    private static readonly (string Field, string Lookup, string? Parent)[] CodedFields =
    {
        (nameof(Hole.ProjectCode), "L01", null),
        (nameof(Hole.Prospect), "L02", nameof(Hole.ProjectCode)),
        (nameof(Hole.TenementId), "L03", null),
        (nameof(Hole.CoordinateSet), "L05", null),
        (nameof(Hole.HolePurpose), "L06", null),
        (nameof(Hole.SubPurpose), "L07", nameof(Hole.HolePurpose)),
        (nameof(Hole.HolePlanTarget), "L08", null),
        (nameof(Hole.PlanDrillType), "L09", null),
        (nameof(Hole.ChiefGeologist), "L10", null),
        (nameof(Hole.TechnicGeologist), "L11", null),
        (nameof(Hole.DrillMaster), "L12", null),
        (nameof(Hole.DrillRig), "L13", null),
        (nameof(Hole.DrillCompany), "L14", null),
    };

    private readonly ValidationContext _ctx;

    public ValidationEngine(ValidationContext context) => _ctx = context;

    public IReadOnlyList<Issue> Validate(Hole hole)
    {
        var issues = new List<Issue>();
        var id = string.IsNullOrWhiteSpace(hole.HoleId) ? "(new hole)" : hole.HoleId.Trim().ToUpperInvariant();
        void Err(string field, string rule, string msg, int? row = null) => issues.Add(new Issue(id, row, field, rule, IssueLevel.Error, msg));
        void Warn(string field, string rule, string msg, int? row = null) => issues.Add(new Issue(id, row, field, rule, IssueLevel.Warning, msg));

        // V-01 mandatory fields
        foreach (var field in _ctx.Settings.EffectiveMandatoryFields)
        {
            if (IsEmpty(Get(hole, field)))
                Err(field, "V-01", $"{Label(field)} is missing: fill it in before sending.");
        }

        // V-02 lookups (parent-filtered)
        foreach (var (field, lookup, parent) in CodedFields)
        {
            var code = Get(hole, field) as string;
            if (string.IsNullOrWhiteSpace(code) || !_ctx.Lookups.IsAvailable(lookup)) continue;
            var parentCode = parent is null ? null : Get(hole, parent) as string;
            if (!_ctx.Lookups.Exists(lookup, code, parentCode))
            {
                var tail = parentCode is null ? "" : $" for {Label(parent!)} {parentCode}";
                Err(field, field == nameof(Hole.SubPurpose) ? "V-14" : "V-02", $"{Label(field)} \"{code}\" is not in the list{tail}.");
            }
        }

        // V-03 / V-04 HOLEID format, uniqueness, parts
        var parts = _ctx.Parser.TryParse(hole.HoleId, out var parseError);
        if (!string.IsNullOrWhiteSpace(hole.HoleId))
        {
            if (parts is null)
                Err(nameof(Hole.HoleId), "V-03", parseError!);
            else
            {
                if (hole.Source != "acquire") // new hole: must not exist anywhere yet
                {
                    if (_ctx.Directory.HoleIdExistsInAcquire(id))
                        Err(nameof(Hole.HoleId), "V-03", $"HOLEID {id} already exists in acQuire.");
                    if (_ctx.Directory.HoleIdExistsInStaging(id, hole.StagingId))
                        Err(nameof(Hole.HoleId), "V-03", $"HOLEID {id} is already used by another hole in preparation.");
                }
                if (_ctx.BatchHoleIds.Count(h => string.Equals(h, id, StringComparison.OrdinalIgnoreCase)) > 1)
                    Err(nameof(Hole.HoleId), "V-03", $"HOLEID {id} appears more than once in this file.");

                if (!string.IsNullOrEmpty(hole.SubPurpose)
                    && _ctx.Settings.SubPurposeLetters.TryGetValue(hole.SubPurpose, out var letter)
                    && !string.Equals(letter, parts.SubPurposeLetter, StringComparison.OrdinalIgnoreCase))
                    Err(nameof(Hole.HoleId), "V-04", $"HOLEID starts with {parts.SubPurposeLetter} but sub purpose {hole.SubPurpose} needs {letter}.");

                if (!string.IsNullOrEmpty(hole.ProjectCode)
                    && _ctx.Parser.Options.ProjectCodes.TryGetValue(parts.ProjectLetters, out var project)
                    && !string.Equals(project, hole.ProjectCode, StringComparison.OrdinalIgnoreCase))
                    Err(nameof(Hole.HoleId), "V-04", $"HOLEID letters {parts.ProjectLetters} mean {project}, but the project is {hole.ProjectCode}.");
            }
        }

        // Coordinates: V-05, V-06, V-10, V-13
        if (hole.X is decimal x && hole.Y is decimal y && !string.IsNullOrEmpty(hole.CoordinateSet))
        {
            var spatial = _ctx.Spatial.Check(x, y, hole.CoordinateSet, hole.Prospect);
            if (spatial is not null) Err(nameof(Hole.X), "V-05", spatial);

            var redrillRoot = parts?.Root;
            foreach (var other in _ctx.Directory.HolesAt(x, y, hole.CoordinateSet, id))
            {
                if (redrillRoot is not null && _ctx.Parser.RootOf(other) == redrillRoot) continue; // re-drilling
                issues.Add(new Issue(id, null, nameof(Hole.X), "V-13", _ctx.Settings.SameCoordinatesLevel, $"Another hole ({other}) has the same coordinates."));
            }

            if (_ctx.Settings.MinDistance is decimal min && _ctx.Directory.Nearest(x, y, hole.CoordinateSet, id) is { } near
                && near.Distance < min && (redrillRoot is null || _ctx.Parser.RootOf(near.HoleId) != redrillRoot) && near.Distance > 0)
                Warn(nameof(Hole.X), "V-10", $"Hole is {near.Distance.ToString("0.#", CultureInfo.InvariantCulture)} m from {near.HoleId}.");
        }
        if (hole.Z is decimal z && ((_ctx.Settings.ZMin is decimal zmin && z < zmin) || (_ctx.Settings.ZMax is decimal zmax && z > zmax)))
            Warn(nameof(Hole.Z), "V-06", $"Z = {z.ToString(CultureInfo.InvariantCulture)} m is unusual here; check it.");

        // V-09 direction
        if (hole.Azimuth is decimal az && (az < 0 || az > 360)) Err(nameof(Hole.Azimuth), "V-09", "Azimuth must be between 0 and 360.");
        if (hole.Dip is decimal dip && (dip < -90 || dip > 0)) Err(nameof(Hole.Dip), "V-09", "Dip must be between −90 and 0.");

        // Planned depth > 0
        if (hole.HolePlanDepth is decimal depth0 && depth0 <= 0) Err(nameof(Hole.HolePlanDepth), "V-01", "Planned depth must be greater than 0.");

        // V-07 / V-16 intervals
        CheckIntervals(hole, Err);

        // V-08 screen and mud plug
        var depth = hole.HolePlanDepth;
        CheckPair(hole.ScreenTop, hole.ScreenBottom, depth, nameof(Hole.ScreenBottom), "Screen", Err);
        CheckPair(hole.MudPlugFrom, hole.MudPlugTo, depth, nameof(Hole.MudPlugTo), "Mud plug", Err);

        // V-12 GTN
        CheckGtn(hole, Err);

        // V-15 KEY is a whole number
        if (_ctx.Settings.KeyMustBeNumeric && !string.IsNullOrWhiteSpace(hole.TechnoWellKey) && !hole.TechnoWellKey.Trim().All(char.IsAsciiDigit))
            Err(nameof(Hole.TechnoWellKey), "V-15", $"KEY must be a whole number (\"{hole.TechnoWellKey}\" is not).");

        // V-15 KEY unique
        if (_ctx.Settings.KeyMustBeUnique && !string.IsNullOrWhiteSpace(hole.TechnoWellKey) && _ctx.Directory.KeyExists(hole.TechnoWellKey, id))
            Err(nameof(Hole.TechnoWellKey), "V-15", $"KEY {hole.TechnoWellKey} is already used by another hole.");

        // V-17 failure comment
        if (hole.Status == HoleStatus.FAILED && string.IsNullOrWhiteSpace(hole.FailureComment))
            Err(nameof(Hole.FailureComment), "V-17", "Explain why the hole is cancelled.");

        // Comment lengths
        foreach (var (field, text) in new[] {
                     (nameof(Hole.PlanComments), hole.PlanComments), (nameof(Hole.PlanStartComment), hole.PlanStartComment),
                     (nameof(Hole.PlanStopComment), hole.PlanStopComment), (nameof(Hole.FailureComment), hole.FailureComment) })
            if (text is not null && text.Length > _ctx.Settings.MaxCommentLength)
                Err(field, "V-01", $"Comment is too long ({text.Length} characters, maximum {_ctx.Settings.MaxCommentLength}).");

        return issues;
    }

    private static void CheckIntervals(Hole hole, Action<string, string, string, int?> err)
    {
        if (hole.Intervals.Count == 0) return; // intervals can be added later
        var destructive = hole.Intervals.Count(i => i.Type == IntervalType.Destructive);
        var core = hole.Intervals.Count(i => i.Type == IntervalType.Core);
        if (destructive > IntervalSlots.MaxDestructive)
            err("Intervals", "V-16", $"acQuire stores up to {IntervalSlots.MaxDestructive} destructive intervals; this hole has {destructive}.", null);
        if (core > IntervalSlots.MaxCore)
            err("Intervals", "V-16", $"acQuire stores up to {IntervalSlots.MaxCore} core intervals; this hole has {core}.", null);

        var rows = hole.Intervals.Select((r, i) => (Row: r, N: i + 1)).OrderBy(t => t.Row.From ?? decimal.MaxValue).ToList();
        decimal? previousTo = null;
        for (var k = 0; k < rows.Count; k++)
        {
            var (r, n) = rows[k];
            if (r.From is null || r.To is null) { err("Intervals", "V-07", $"Interval {n}: enter both From and To.", n); continue; }
            if (r.From >= r.To) err("Intervals", "V-07", $"Interval {n}: From ({r.From} m) must be above To ({r.To} m).", n);
            if (k == 0 && r.From != 0) err("Intervals", "V-07", $"The first interval must start at 0 m, not {r.From} m.", n);
            if (previousTo is not null && r.From != previousTo)
                err("Intervals", "V-07", $"Interval {n} starts at {r.From} m but the previous interval ends at {previousTo} m.", n);
            if (r.Type == IntervalType.Destructive && (r.Recovery is not null || !string.IsNullOrEmpty(r.Comment)))
                err("Intervals", "V-07", $"Interval {n}: Rec and comment apply to core intervals only.", n);
            if (r.Recovery is decimal rec && (rec < 0 || rec > 100)) err("Intervals", "V-07", $"Interval {n}: Rec must be between 0 and 100 %.", n);
            previousTo = r.To;
        }
        if (previousTo is decimal last && hole.HolePlanDepth is decimal depth && last > depth)
            err("Intervals", "V-07", $"Intervals reach {last} m, deeper than the planned depth ({depth} m).", null);
    }

    private static void CheckPair(decimal? top, decimal? bottom, decimal? depth, string field, string name, Action<string, string, string, int?> err)
    {
        if (top is not null && bottom is not null && top >= bottom)
            err(field, "V-08", $"{name} top ({top} m) must be above {name.ToLowerInvariant()} bottom ({bottom} m).", null);
        if (bottom is not null && depth is not null && bottom > depth)
            err(field, "V-08", $"{name} bottom ({bottom} m) is deeper than the planned depth ({depth} m).", null);
    }

    private void CheckGtn(Hole hole, Action<string, string, string, int?> err)
    {
        var same = _ctx.Settings.GtnSameIntervals;
        var rows = hole.Gtn.Select((g, i) => (Row: g, N: i + 1)).ToList();
        foreach (var (g, n) in rows)
        {
            if (g.From is null || g.To is null) { err("Gtn", "V-01", $"GTN row {n}: enter GTN_FROM and GTN_TO.", n); continue; }
            if (g.From < 0 || g.From >= g.To) err("Gtn", "V-12", $"GTN row {n}: GTN_FROM must be ≥ 0 and above GTN_TO.", n);

            var hasLitho = !string.IsNullOrWhiteSpace(g.Lithology);
            var hasRisk = !string.IsNullOrWhiteSpace(g.CaCO3Risk);
            if (same)
            {
                if (!hasLitho) err("Gtn", "V-01", $"GTN row {n}: Lithology is missing.", n);
                if (!hasRisk) err("Gtn", "V-01", $"GTN row {n}: CaCO3 risk is missing.", n);
            }
            else if (!hasLitho && !hasRisk)
                err("Gtn", "V-01", $"GTN row {n}: enter a Lithology, a CaCO3 risk, or both.", n);

            if (hasLitho && _ctx.Lookups.IsAvailable("L15") && !_ctx.Lookups.Exists("L15", g.Lithology!))
                err("Gtn", "V-02", $"GTN row {n}: Lithology \"{g.Lithology}\" is not in the list.", n);
            if (hasRisk && g.CaCO3Risk is not ("Yes" or "No"))
                err("Gtn", "V-12", $"GTN row {n}: CaCO3 risk must be Yes or No.", n);
        }

        // Overlaps: across all rows when the intervals are shared, otherwise per attribute.
        var valid = rows.Where(t => t.Row.From is not null && t.Row.To is not null).ToList();
        if (same) CheckOverlaps(valid, "GTN", err);
        else
        {
            CheckOverlaps(valid.Where(t => !string.IsNullOrWhiteSpace(t.Row.Lithology)).ToList(), "Lithology", err);
            CheckOverlaps(valid.Where(t => !string.IsNullOrWhiteSpace(t.Row.CaCO3Risk)).ToList(), "CaCO3 risk", err);
        }
    }

    private static void CheckOverlaps(List<(GtnRow Row, int N)> rows, string what, Action<string, string, string, int?> err)
    {
        var sorted = rows.OrderBy(t => t.Row.From).ToList();
        for (var k = 1; k < sorted.Count; k++)
        {
            var a = sorted[k - 1]; var b = sorted[k];
            if (b.Row.From < a.Row.To)
                err("Gtn", "V-12", $"{what} rows {a.N} and {b.N} overlap ({a.Row.From}–{a.Row.To} m and {b.Row.From}–{b.Row.To} m).", b.N);
        }
    }

    private static string Label(string field) => Labels.TryGetValue(field, out var l) ? l : field;

    private static object? Get(Hole hole, string property) =>
        typeof(Hole).GetProperty(property)?.GetValue(hole);

    private static bool IsEmpty(object? value) => value switch
    {
        null => true,
        string s => string.IsNullOrWhiteSpace(s),
        _ => false
    };
}
