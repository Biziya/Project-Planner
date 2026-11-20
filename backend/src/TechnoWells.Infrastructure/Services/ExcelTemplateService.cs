using System.Globalization;
using System.Reflection;
using ClosedXML.Excel;
using Microsoft.Extensions.Options;
using TechnoWells.Core.Model;

namespace TechnoWells.Infrastructure.Services;

public sealed class ExcelColumn
{
    public string Header { get; set; } = "";
    /// <summary>Property of Hole (Holes sheet), Interval (Intervals sheet) or GtnRow (GTN sheet); "HoleId" links rows to a hole.</summary>
    public string Field { get; set; } = "";
    /// <summary>Lookup id for a dropdown list (L01…L16), optional.</summary>
    public string? Lookup { get; set; }
}

/// <summary>
/// Excel template layout (spec 8). PROVISIONAL until the users send the export of the planning software:
/// then only this configuration changes (headers, order, sheet names). Lists are empty here so that a layout
/// in appsettings.json replaces the defaults instead of being added to them.
/// </summary>
public sealed class ExcelTemplateOptions
{
    public string Version { get; set; } = "0.1";
    public string HolesSheet { get; set; } = "Holes";
    public string IntervalsSheet { get; set; } = "Intervals";
    public string GtnSheet { get; set; } = "GTN";
    public List<ExcelColumn> HoleColumns { get; set; } = new();
    public List<ExcelColumn> IntervalColumns { get; set; } = new();
    public List<ExcelColumn> GtnColumns { get; set; } = new();

    public IReadOnlyList<ExcelColumn> EffectiveHoleColumns => HoleColumns.Count > 0 ? HoleColumns : DefaultHoleColumns;
    public IReadOnlyList<ExcelColumn> EffectiveIntervalColumns => IntervalColumns.Count > 0 ? IntervalColumns : DefaultIntervalColumns;
    public IReadOnlyList<ExcelColumn> EffectiveGtnColumns => GtnColumns.Count > 0 ? GtnColumns : DefaultGtnColumns;

    private static ExcelColumn C(string header, string field, string? lookup = null) => new() { Header = header, Field = field, Lookup = lookup };

    public static readonly IReadOnlyList<ExcelColumn> DefaultHoleColumns = new[]
    {
        C("HOLEID", nameof(Hole.HoleId)), C("Project", nameof(Hole.ProjectCode), "L01"), C("Campaign", nameof(Hole.Prospect), "L02"),
        C("Tenement", nameof(Hole.TenementId), "L03"), C("KEY", nameof(Hole.TechnoWellKey)),
        C("X", nameof(Hole.X)), C("Y", nameof(Hole.Y)), C("Z", nameof(Hole.Z)), C("Coordinate system", nameof(Hole.CoordinateSet), "L05"),
        C("Azimuth", nameof(Hole.Azimuth)), C("Dip", nameof(Hole.Dip)),
        C("Purpose", nameof(Hole.HolePurpose), "L06"), C("Sub purpose", nameof(Hole.SubPurpose), "L07"), C("Target", nameof(Hole.HolePlanTarget), "L08"),
        C("Start date", nameof(Hole.HolePlanDate)), C("Planned drill type", nameof(Hole.PlanDrillType), "L09"), C("Planned depth", nameof(Hole.HolePlanDepth)),
        C("Max deviation", nameof(Hole.MaxDeviation)), C("Supervisor", nameof(Hole.ChiefGeologist), "L10"), C("Technic geologist", nameof(Hole.TechnicGeologist), "L11"),
        C("Drill master", nameof(Hole.DrillMaster), "L12"), C("Drill rig", nameof(Hole.DrillRig), "L13"), C("Drill company", nameof(Hole.DrillCompany), "L14"),
        C("Mud plug top", nameof(Hole.MudPlugFrom)), C("Mud plug bottom", nameof(Hole.MudPlugTo)), C("Screen top", nameof(Hole.ScreenTop)), C("Screen bottom", nameof(Hole.ScreenBottom)),
        C("General comment", nameof(Hole.PlanComments)), C("Drilling start comment", nameof(Hole.PlanStartComment)), C("Drilling stop comment", nameof(Hole.PlanStopComment)),
    };

    public static readonly IReadOnlyList<ExcelColumn> DefaultIntervalColumns = new[]
    {
        C("HOLEID", "HoleId"), C("Interval type", nameof(Interval.Type)), C("From", nameof(Interval.From)), C("To", nameof(Interval.To)),
        C("Rec %", nameof(Interval.Recovery)), C("End of range comment", nameof(Interval.Comment)),
    };

    public static readonly IReadOnlyList<ExcelColumn> DefaultGtnColumns = new[]
    {
        C("HOLEID", "HoleId"), C("GTN_FROM", nameof(GtnRow.From)), C("GTN_TO", nameof(GtnRow.To)), C("Lithology", nameof(GtnRow.Lithology), "L15"), C("CaCO3 risk", nameof(GtnRow.CaCO3Risk), "L16"),
    };
}

public sealed class ExcelTemplateService(IOptions<ExcelTemplateOptions> options, ILookupRepository lookups) : IExcelTemplateService
{
    private const string MetaSheet = "_meta";
    private const string ListsSheet = "_lists";
    private const int MaxRows = 2000;
    private ExcelTemplateOptions O => options.Value;

    public string CurrentVersion => O.Version;

    // ------------------------------------------------------------------ export
    public byte[] BuildTemplate(IEnumerable<Hole> rows, bool includeHoleSheets, bool includeGtnSheet)
    {
        var holes = rows.ToList();
        using var wb = new XLWorkbook();
        var lists = wb.Worksheets.Add(ListsSheet);
        var listRanges = new Dictionary<string, IXLRange>();

        IXLRange? ListFor(string? lookupId)
        {
            if (lookupId is null) return null;
            if (listRanges.TryGetValue(lookupId, out var r)) return r;
            var items = lookups.Get(lookupId);
            if (items.Count == 0) return null;
            var col = listRanges.Count + 1;
            lists.Cell(1, col).Value = lookupId;
            for (var i = 0; i < items.Count; i++) lists.Cell(i + 2, col).Value = items[i].Code;
            r = lists.Range(2, col, items.Count + 1, col);
            listRanges[lookupId] = r;
            return r;
        }

        void Sheet<T>(string name, IReadOnlyList<ExcelColumn> columns, IEnumerable<(string HoleId, T Item)> data)
        {
            var ws = wb.Worksheets.Add(name);
            for (var c = 0; c < columns.Count; c++)
            {
                ws.Cell(1, c + 1).Value = columns[c].Header;
                if (ListFor(columns[c].Lookup) is { } range)
                    ws.Range(2, c + 1, MaxRows, c + 1).CreateDataValidation().List(range, true);
            }
            var r = 2;
            foreach (var (holeId, item) in data)
            {
                for (var c = 0; c < columns.Count; c++)
                {
                    var value = columns[c].Field == "HoleId" ? holeId : Get(item!, columns[c].Field);
                    SetCell(ws.Cell(r, c + 1), value);
                }
                r++;
            }
            ws.Row(1).Style.Font.Bold = true;
            ws.SheetView.FreezeRows(1);
            ws.Columns().AdjustToContents();
        }

        if (includeHoleSheets)
        {
            Sheet(O.HolesSheet, O.EffectiveHoleColumns, holes.Select(h => (h.HoleId, h)));
            Sheet(O.IntervalsSheet, O.EffectiveIntervalColumns, holes.SelectMany(h => h.Intervals.Select(i => (h.HoleId, i))));
        }
        if (includeGtnSheet)
            Sheet(O.GtnSheet, O.EffectiveGtnColumns, holes.SelectMany(h => h.Gtn.Select(g => (h.HoleId, g))));

        var meta = wb.Worksheets.Add(MetaSheet);
        meta.Cell(1, 1).Value = "TemplateVersion";
        meta.Cell(1, 2).Value = O.Version;
        meta.Cell(2, 1).Value = "GeneratedAtUtc";
        meta.Cell(2, 2).Value = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ssZ", CultureInfo.InvariantCulture);
        meta.Visibility = XLWorksheetVisibility.Hidden;
        lists.Visibility = XLWorksheetVisibility.Hidden;

        using var ms = new MemoryStream();
        wb.SaveAs(ms);
        return ms.ToArray();
    }

    // ------------------------------------------------------------------ import
    public ExcelHolesRead ReadHoles(Stream file)
    {
        using var wb = new XLWorkbook(file);
        var issues = new List<ImportRowIssue>();
        var holes = new List<(int Row, Hole Hole)>();
        var byId = new Dictionary<string, Hole>(StringComparer.OrdinalIgnoreCase);

        if (!wb.TryGetWorksheet(O.HolesSheet, out var ws))
        {
            issues.Add(new ImportRowIssue(0, null, "", "S-03", "error", $"Sheet \"{O.HolesSheet}\" not found."));
            return new ExcelHolesRead(holes, issues, Version(wb));
        }
        foreach (var (row, hole) in ReadRows<Hole>(ws, O.EffectiveHoleColumns, issues, out _))
        {
            if (string.IsNullOrWhiteSpace(hole.HoleId)) { issues.Add(new ImportRowIssue(row, null, "HoleId", "V-01", "error", "HOLEID is missing: row ignored.")); continue; }
            holes.Add((row, hole));
            byId.TryAdd(hole.HoleId.Trim(), hole);
        }
        if (wb.TryGetWorksheet(O.IntervalsSheet, out var wi))
            foreach (var (row, interval) in ReadRows<Interval>(wi, O.EffectiveIntervalColumns, issues, out var ids))
                if (ids.TryGetValue(row, out var id) && byId.TryGetValue(id, out var h)) h.Intervals.Add(interval);
                else issues.Add(new ImportRowIssue(row, ids.GetValueOrDefault(row), "HoleId", "V-01", "error", $"{O.IntervalsSheet} row {row}: HOLEID not found in sheet {O.HolesSheet}."));
        if (wb.TryGetWorksheet(O.GtnSheet, out var wg))
            foreach (var (row, gtn) in ReadRows<GtnRow>(wg, O.EffectiveGtnColumns, issues, out var ids))
                if (ids.TryGetValue(row, out var id) && byId.TryGetValue(id, out var h)) h.Gtn.Add(gtn);
                else issues.Add(new ImportRowIssue(row, ids.GetValueOrDefault(row), "HoleId", "V-01", "error", $"{O.GtnSheet} row {row}: HOLEID not found in sheet {O.HolesSheet}."));
        return new ExcelHolesRead(holes, issues, Version(wb));
    }

    public ExcelGtnRead ReadGtn(Stream file)
    {
        using var wb = new XLWorkbook(file);
        var issues = new List<ImportRowIssue>();
        var rows = new List<(int Row, string HoleId, GtnRow Gtn)>();
        if (!wb.TryGetWorksheet(O.GtnSheet, out var ws))
        {
            issues.Add(new ImportRowIssue(0, null, "", "P-04", "error", $"Sheet \"{O.GtnSheet}\" not found."));
            return new ExcelGtnRead(rows, issues, Version(wb));
        }
        foreach (var (row, gtn) in ReadRows<GtnRow>(ws, O.EffectiveGtnColumns, issues, out var ids))
        {
            if (!ids.TryGetValue(row, out var id) || string.IsNullOrWhiteSpace(id))
                issues.Add(new ImportRowIssue(row, null, "HoleId", "V-01", "error", "HOLEID is missing: row ignored."));
            else rows.Add((row, id.Trim().ToUpperInvariant(), gtn));
        }
        return new ExcelGtnRead(rows, issues, Version(wb));
    }

    // ------------------------------------------------------------------ helpers
    private static string? Version(XLWorkbook wb) =>
        wb.TryGetWorksheet(MetaSheet, out var meta) ? meta.Cell(1, 2).GetString() : null;

    private static IEnumerable<(int Row, T Item)> ReadRows<T>(IXLWorksheet ws, IReadOnlyList<ExcelColumn> columns, List<ImportRowIssue> issues,
        out Dictionary<int, string> holeIds) where T : new()
    {
        var map = new Dictionary<int, ExcelColumn>();
        var header = ws.Row(1);
        foreach (var cell in header.CellsUsed())
        {
            var col = columns.FirstOrDefault(c => string.Equals(c.Header, cell.GetString().Trim(), StringComparison.OrdinalIgnoreCase));
            if (col is not null) map[cell.Address.ColumnNumber] = col;
        }
        foreach (var missing in columns.Where(c => !map.ContainsValue(c)))
            issues.Add(new ImportRowIssue(1, null, missing.Field, "S-03", "warning", $"Column \"{missing.Header}\" not found in sheet {ws.Name}."));

        var ids = new Dictionary<int, string>();
        var result = new List<(int, T)>();
        foreach (var row in ws.RowsUsed().Where(r => r.RowNumber() > 1))
        {
            var item = new T();
            var n = row.RowNumber();
            foreach (var (colNumber, col) in map)
            {
                var cell = row.Cell(colNumber);
                if (col.Field == "HoleId" && typeof(T) != typeof(Hole)) { ids[n] = cell.GetString().Trim(); continue; }
                if (!Set(item!, col.Field, cell, out var error))
                    issues.Add(new ImportRowIssue(n, null, col.Field, "F", "error", $"{ws.Name} row {n}, {col.Header}: {error}"));
            }
            result.Add((n, item));
        }
        holeIds = ids;
        return result;
    }

    private static object? Get(object target, string field) =>
        target.GetType().GetProperty(field, BindingFlags.Public | BindingFlags.Instance | BindingFlags.IgnoreCase)?.GetValue(target);

    private static void SetCell(IXLCell cell, object? value)
    {
        switch (value)
        {
            case null: break;
            case decimal d: cell.Value = (double)d; break;
            case DateOnly d: cell.Value = d.ToDateTime(TimeOnly.MinValue); cell.Style.DateFormat.Format = "yyyy-mm-dd"; break;
            case Enum e: cell.Value = e.ToString(); break;
            default: cell.Value = Convert.ToString(value, CultureInfo.InvariantCulture); break;
        }
    }

    private static bool Set(object target, string field, IXLCell cell, out string? error)
    {
        error = null;
        var prop = target.GetType().GetProperty(field, BindingFlags.Public | BindingFlags.Instance | BindingFlags.IgnoreCase);
        if (prop is null || !prop.CanWrite) { error = $"unknown field {field}"; return false; }
        if (cell.IsEmpty()) return true;
        var type = Nullable.GetUnderlyingType(prop.PropertyType) ?? prop.PropertyType;
        var text = cell.GetString().Trim();

        if (type == typeof(string)) { prop.SetValue(target, text.Length == 0 ? null : text); return true; }
        if (type == typeof(decimal))
        {
            if (cell.TryGetValue<double>(out var dbl)) { prop.SetValue(target, (decimal)dbl); return true; }
            if (decimal.TryParse(text.Replace(',', '.').Replace(" ", ""), NumberStyles.Number, CultureInfo.InvariantCulture, out var d)) { prop.SetValue(target, d); return true; }
            error = $"\"{text}\" is not a number."; return false;
        }
        if (type == typeof(DateOnly))
        {
            if (cell.TryGetValue<DateTime>(out var dt)) { prop.SetValue(target, DateOnly.FromDateTime(dt)); return true; }
            if (DateOnly.TryParse(text, CultureInfo.InvariantCulture, out var d)) { prop.SetValue(target, d); return true; }
            error = $"\"{text}\" is not a date (YYYY-MM-DD)."; return false;
        }
        if (type.IsEnum)
        {
            if (Enum.TryParse(type, text, ignoreCase: true, out var e)) { prop.SetValue(target, e); return true; }
            error = $"\"{text}\" must be one of {string.Join(", ", Enum.GetNames(type))}."; return false;
        }
        error = $"unsupported type for {field}"; return false;
    }
}
