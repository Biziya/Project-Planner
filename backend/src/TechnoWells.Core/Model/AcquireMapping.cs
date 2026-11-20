using System.Globalization;

namespace TechnoWells.Core.Model;

/// <summary>An attribute value as stored in acQuire's attribute tables (HOLEDETAILS, HOLECOMMENT, HOLEBIGCOMMENT).</summary>
public sealed record AcquireAttribute(string Table, string Name, string? Value);

/// <summary>A GEODETAILS attribute of one interval (PK = HOLEID + GEOLFROM + GEOLTO + attribute name).</summary>
public sealed record AcquireGeoAttribute(decimal From, decimal To, string Name, string? Value, int Priority);

/// <summary>
/// Field mapping of spec table 5.3. Columns (HOLELOCATION, HOLECOORD) are handled by the writer directly;
/// this class converts the attribute part both ways. Azimuth, Dip, MaxDeviation and AssociatedCells have no
/// acQuire field yet and are not written.
/// </summary>
public static class AcquireMapping
{
    public const string HoleDetails = "HOLEDETAILS";
    public const string HoleComment = "HOLECOMMENT";
    public const string HoleBigComment = "HOLEBIGCOMMENT";
    public const int GtnPriority = 100;

    private static readonly CultureInfo Inv = CultureInfo.InvariantCulture;

    /// <summary>(table, attribute) → getter / setter on <see cref="Hole"/>.</summary>
    private static readonly (string Table, string Name, Func<Hole, string?> Get, Action<Hole, string?> Set)[] Fields =
    {
        (HoleDetails, "BisNumber", h => h.BisNumber, (h, v) => h.BisNumber = v),
        (HoleDetails, "HoleStatus", h => h.Status == HoleStatus.Preparation ? null : h.Status.ToString(), (h, v) => h.Status = Enum.TryParse<HoleStatus>(v, out var s) ? s : h.Status),
        (HoleDetails, "DepthBin", h => h.DepthBin, (h, v) => h.DepthBin = v),
        (HoleDetails, "TechnoWellKey", h => h.TechnoWellKey, (h, v) => h.TechnoWellKey = v),
        (HoleDetails, "HolePrefix", h => h.HolePrefix, (h, v) => h.HolePrefix = v),
        (HoleDetails, "EastingColumnHexa", h => h.EastingColumnHexa, (h, v) => h.EastingColumnHexa = v),
        (HoleDetails, "NorthingRowHexa", h => h.NorthingRowHexa, (h, v) => h.NorthingRowHexa = v),
        (HoleDetails, "HolePurpose", h => h.HolePurpose, (h, v) => h.HolePurpose = v),
        (HoleDetails, "SubPurpose", h => h.SubPurpose, (h, v) => h.SubPurpose = v),
        (HoleDetails, "HolePlanTarget", h => h.HolePlanTarget, (h, v) => h.HolePlanTarget = v),
        (HoleDetails, "HolePlanDate", h => h.HolePlanDate?.ToString("yyyy-MM-dd", Inv), (h, v) => h.HolePlanDate = DateOnly.TryParse(v, Inv, out var d) ? d : null),
        (HoleDetails, "PlanDrillType", h => h.PlanDrillType, (h, v) => h.PlanDrillType = v),
        (HoleDetails, "HolePlanDepth", h => Num(h.HolePlanDepth), (h, v) => h.HolePlanDepth = Dec(v)),
        (HoleDetails, "ChiefGeologist", h => h.ChiefGeologist, (h, v) => h.ChiefGeologist = v),
        (HoleDetails, "TechnicGeologist", h => h.TechnicGeologist, (h, v) => h.TechnicGeologist = v),
        (HoleDetails, "DrillMaster", h => h.DrillMaster, (h, v) => h.DrillMaster = v),
        (HoleDetails, "DrillRig", h => h.DrillRig, (h, v) => h.DrillRig = v),
        (HoleDetails, "DrillCompany", h => h.DrillCompany, (h, v) => h.DrillCompany = v),
        (HoleDetails, "HoleMudPlugFrom", h => Num(h.MudPlugFrom), (h, v) => h.MudPlugFrom = Dec(v)),
        (HoleDetails, "HoleMudPlugTo", h => Num(h.MudPlugTo), (h, v) => h.MudPlugTo = Dec(v)),
        (HoleDetails, "ScreenTop", h => Num(h.ScreenTop), (h, v) => h.ScreenTop = Dec(v)),
        (HoleDetails, "ScreenBottom", h => Num(h.ScreenBottom), (h, v) => h.ScreenBottom = Dec(v)),
        (HoleComment, "HolePlanComments", h => h.PlanComments, (h, v) => h.PlanComments = v),
        (HoleComment, "HoleAbandonComment", h => h.FailureComment, (h, v) => h.FailureComment = v),
        (HoleBigComment, "PlanStartComment", h => h.PlanStartComment, (h, v) => h.PlanStartComment = v),
        (HoleBigComment, "PlanStopComment", h => h.PlanStopComment, (h, v) => h.PlanStopComment = v),
    };

    private static readonly HashSet<string> SlotNames = new(IntervalSlots.ToSlots(Array.Empty<Interval>()).Keys, StringComparer.OrdinalIgnoreCase);

    /// <summary>All attributes of a hole, including interval slots (empty slots carry a null value so they are cleared).</summary>
    public static IReadOnlyList<AcquireAttribute> ToAttributes(Hole hole)
    {
        var list = Fields.Select(f => new AcquireAttribute(f.Table, f.Name, f.Get(hole))).ToList();
        foreach (var (name, value) in IntervalSlots.ToSlots(hole.Intervals))
        {
            var table = name.StartsWith("PlanCoredComment", StringComparison.Ordinal) ? HoleBigComment : HoleDetails;
            list.Add(new AcquireAttribute(table, name, value switch { decimal d => Num(d), null => null, _ => Convert.ToString(value, Inv) }));
        }
        return list;
    }

    /// <summary>Fills a hole from attribute rows read from acQuire (unknown names are ignored).</summary>
    public static void FromAttributes(Hole hole, IEnumerable<AcquireAttribute> attributes)
    {
        var slots = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase);
        foreach (var a in attributes)
        {
            if (SlotNames.Contains(a.Name)) { slots[a.Name] = a.Value; continue; }
            var f = Fields.FirstOrDefault(x => string.Equals(x.Name, a.Name, StringComparison.OrdinalIgnoreCase));
            f.Set?.Invoke(hole, string.IsNullOrWhiteSpace(a.Value) ? null : a.Value);
        }
        hole.Intervals = IntervalSlots.FromSlots(slots);
    }

    /// <summary>
    /// GEODETAILS rows of the GTN panel (LithoPlanned, CACO3_Risks) with PRIORITY 100. Only filled attributes are
    /// written, so a row may carry one attribute only: the two attributes can have different intervals.
    /// </summary>
    public static IReadOnlyList<AcquireGeoAttribute> ToGeoAttributes(Hole hole) =>
        hole.Gtn.Where(g => g.From is not null && g.To is not null)
            .SelectMany(g => new[]
            {
                new AcquireGeoAttribute(g.From!.Value, g.To!.Value, "LithoPlanned", g.Lithology, GtnPriority),
                new AcquireGeoAttribute(g.From!.Value, g.To!.Value, "CACO3_Risks", g.CaCO3Risk, GtnPriority)
            })
            .Where(a => !string.IsNullOrWhiteSpace(a.Value))
            .ToList();

    public static List<GtnRow> FromGeoAttributes(IEnumerable<AcquireGeoAttribute> rows) =>
        rows.GroupBy(r => (r.From, r.To)).OrderBy(g => g.Key.From)
            .Select(g => new GtnRow
            {
                From = g.Key.From, To = g.Key.To,
                Lithology = g.FirstOrDefault(r => r.Name.Equals("LithoPlanned", StringComparison.OrdinalIgnoreCase))?.Value,
                CaCO3Risk = g.FirstOrDefault(r => r.Name.Equals("CACO3_Risks", StringComparison.OrdinalIgnoreCase))?.Value
            }).ToList();

    private static string? Num(decimal? d) => d?.ToString(Inv);
    private static decimal? Dec(string? s) => decimal.TryParse(s, NumberStyles.Number, Inv, out var d) ? d : null;
}
