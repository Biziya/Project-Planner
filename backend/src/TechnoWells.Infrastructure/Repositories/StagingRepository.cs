using System.Data;
using Dapper;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Options;
using TechnoWells.Core.Model;
using TechnoWells.Core.Validation;

namespace TechnoWells.Infrastructure.Repositories;

// =====================================================================
// Staging repository: stg.STG_COLLAR + stg.STG_GEODETAILS
// =====================================================================
public sealed class StagingRepository(SqlConnections db) : IStagingRepository
{
    /// <summary>Row of stg.STG_COLLAR; property names = column names.</summary>
    private sealed class HoleRow
    {
        public Guid stg_hole_id { get; set; }
        public string app_status { get; set; } = "Preparation";
        public string source { get; set; } = "form";
        public byte[]? row_version { get; set; }
        public string holeid { get; set; } = "";
        public string? bis_number { get; set; }
        public string? projectcode { get; set; }
        public string? prospect { get; set; }
        public string? tenementid { get; set; }
        public string? hole_status { get; set; }
        public string? hole_abandon_comment { get; set; }
        public string? depth_bin { get; set; }
        public string? technowell_key { get; set; }
        public string? hole_prefix { get; set; }
        public string? easting_column_hexa { get; set; }
        public string? northing_row_hexa { get; set; }
        public decimal? x { get; set; }
        public decimal? y { get; set; }
        public decimal? z { get; set; }
        public string? coordinateset { get; set; }
        public decimal? azimuth { get; set; }
        public decimal? dip { get; set; }
        public string? hole_purpose { get; set; }
        public string? sub_purpose { get; set; }
        public string? hole_plan_target { get; set; }
        public DateTime? hole_plan_date { get; set; }
        public string? plan_drill_type { get; set; }
        public decimal? hole_plan_depth { get; set; }
        public decimal? max_deviation { get; set; }
        public string? chief_geologist { get; set; }
        public string? technic_geologist { get; set; }
        public string? drill_master { get; set; }
        public string? drill_rig { get; set; }
        public string? drill_company { get; set; }
        public string? associated_cells { get; set; }
        public decimal? plan_from_d1 { get; set; } public decimal? plan_to_d1 { get; set; }
        public decimal? plan_from_d2 { get; set; } public decimal? plan_to_d2 { get; set; }
        public decimal? plan_from_d3 { get; set; } public decimal? plan_to_d3 { get; set; }
        public decimal? plan_from_d4 { get; set; } public decimal? plan_to_d4 { get; set; }
        public decimal? plan_from_c1 { get; set; } public decimal? plan_to_c1 { get; set; } public decimal? plan_recovery_c1 { get; set; } public string? plan_cored_comment1 { get; set; }
        public decimal? plan_from_c2 { get; set; } public decimal? plan_to_c2 { get; set; } public decimal? plan_recovery_c2 { get; set; } public string? plan_cored_comment2 { get; set; }
        public decimal? plan_from_c3 { get; set; } public decimal? plan_to_c3 { get; set; } public decimal? plan_recovery_c3 { get; set; } public string? plan_cored_comment3 { get; set; }
        public decimal? hole_mud_plug_from { get; set; }
        public decimal? hole_mud_plug_to { get; set; }
        public decimal? screen_top { get; set; }
        public decimal? screen_bottom { get; set; }
        public string? hole_plan_comments { get; set; }
        public string? plan_start_comment { get; set; }
        public string? plan_stop_comment { get; set; }
        public int error_count { get; set; }
        public int warning_count { get; set; }
        public string? user_name { get; set; }
    }

    private sealed class GeoRow
    {
        public Guid? stg_hole_id { get; set; }
        public string holeid { get; set; } = "";
        public decimal geol_from { get; set; }
        public decimal geol_to { get; set; }
        public string? litho_planned { get; set; }
        public string? caco3_risks { get; set; }
        public string? user_name { get; set; }
    }

    private static readonly string[] DataColumns = typeof(HoleRow).GetProperties()
        .Select(p => p.Name)
        .Where(n => n is not ("stg_hole_id" or "row_version" or "app_status" or "user_name"))
        .ToArray();

    private static Hole ToHole(HoleRow r, IEnumerable<GeoRow> geo)
    {
        var slots = new Dictionary<string, object?>
        {
            ["PlanFromD1"] = r.plan_from_d1, ["PlanToD1"] = r.plan_to_d1, ["PlanFromD2"] = r.plan_from_d2, ["PlanToD2"] = r.plan_to_d2,
            ["PlanFromD3"] = r.plan_from_d3, ["PlanToD3"] = r.plan_to_d3, ["PlanFromD4"] = r.plan_from_d4, ["PlanToD4"] = r.plan_to_d4,
            ["PlanFromC1"] = r.plan_from_c1, ["PlanToC1"] = r.plan_to_c1, ["PlanRecoveryC1"] = r.plan_recovery_c1, ["PlanCoredComment1"] = r.plan_cored_comment1,
            ["PlanFromC2"] = r.plan_from_c2, ["PlanToC2"] = r.plan_to_c2, ["PlanRecoveryC2"] = r.plan_recovery_c2, ["PlanCoredComment2"] = r.plan_cored_comment2,
            ["PlanFromC3"] = r.plan_from_c3, ["PlanToC3"] = r.plan_to_c3, ["PlanRecoveryC3"] = r.plan_recovery_c3, ["PlanCoredComment3"] = r.plan_cored_comment3,
        };
        return new Hole
        {
            StagingId = r.stg_hole_id, Source = r.source, RowVersion = r.row_version, Status = HoleStatus.Preparation,
            HoleId = r.holeid, BisNumber = r.bis_number, ProjectCode = r.projectcode, Prospect = r.prospect, TenementId = r.tenementid,
            FailureComment = r.hole_abandon_comment, DepthBin = r.depth_bin, TechnoWellKey = r.technowell_key, HolePrefix = r.hole_prefix,
            EastingColumnHexa = r.easting_column_hexa, NorthingRowHexa = r.northing_row_hexa, X = r.x, Y = r.y, Z = r.z,
            CoordinateSet = r.coordinateset, Azimuth = r.azimuth, Dip = r.dip, HolePurpose = r.hole_purpose, SubPurpose = r.sub_purpose,
            HolePlanTarget = r.hole_plan_target, HolePlanDate = r.hole_plan_date is { } d ? DateOnly.FromDateTime(d) : null,
            PlanDrillType = r.plan_drill_type, HolePlanDepth = r.hole_plan_depth, MaxDeviation = r.max_deviation,
            ChiefGeologist = r.chief_geologist, TechnicGeologist = r.technic_geologist, DrillMaster = r.drill_master, DrillRig = r.drill_rig,
            DrillCompany = r.drill_company, AssociatedCells = r.associated_cells, Intervals = IntervalSlots.FromSlots(slots),
            MudPlugFrom = r.hole_mud_plug_from, MudPlugTo = r.hole_mud_plug_to, ScreenTop = r.screen_top, ScreenBottom = r.screen_bottom,
            PlanComments = r.hole_plan_comments, PlanStartComment = r.plan_start_comment, PlanStopComment = r.plan_stop_comment,
            Gtn = geo.OrderBy(g => g.geol_from).Select(g => new GtnRow { From = g.geol_from, To = g.geol_to, Lithology = g.litho_planned, CaCO3Risk = g.caco3_risks }).ToList()
        };
    }

    private static HoleRow ToRow(Hole h, int errors, int warnings, string user)
    {
        var s = IntervalSlots.ToSlots(h.Intervals);
        decimal? D(string k) => (decimal?)s[k];
        string? S(string k) => (string?)s[k];
        return new HoleRow
        {
            stg_hole_id = h.StagingId ?? Guid.NewGuid(), source = h.Source is "excel" ? "excel" : "form", row_version = h.RowVersion,
            holeid = h.HoleId.Trim().ToUpperInvariant(), bis_number = h.BisNumber, projectcode = h.ProjectCode, prospect = h.Prospect,
            tenementid = h.TenementId, hole_status = null, hole_abandon_comment = h.FailureComment, depth_bin = h.DepthBin,
            technowell_key = h.TechnoWellKey, hole_prefix = h.HolePrefix, easting_column_hexa = h.EastingColumnHexa, northing_row_hexa = h.NorthingRowHexa,
            x = h.X, y = h.Y, z = h.Z, coordinateset = h.CoordinateSet, azimuth = h.Azimuth, dip = h.Dip, hole_purpose = h.HolePurpose,
            sub_purpose = h.SubPurpose, hole_plan_target = h.HolePlanTarget, hole_plan_date = h.HolePlanDate?.ToDateTime(TimeOnly.MinValue),
            plan_drill_type = h.PlanDrillType, hole_plan_depth = h.HolePlanDepth, max_deviation = h.MaxDeviation, chief_geologist = h.ChiefGeologist,
            technic_geologist = h.TechnicGeologist, drill_master = h.DrillMaster, drill_rig = h.DrillRig, drill_company = h.DrillCompany,
            associated_cells = h.AssociatedCells,
            plan_from_d1 = D("PlanFromD1"), plan_to_d1 = D("PlanToD1"), plan_from_d2 = D("PlanFromD2"), plan_to_d2 = D("PlanToD2"),
            plan_from_d3 = D("PlanFromD3"), plan_to_d3 = D("PlanToD3"), plan_from_d4 = D("PlanFromD4"), plan_to_d4 = D("PlanToD4"),
            plan_from_c1 = D("PlanFromC1"), plan_to_c1 = D("PlanToC1"), plan_recovery_c1 = D("PlanRecoveryC1"), plan_cored_comment1 = S("PlanCoredComment1"),
            plan_from_c2 = D("PlanFromC2"), plan_to_c2 = D("PlanToC2"), plan_recovery_c2 = D("PlanRecoveryC2"), plan_cored_comment2 = S("PlanCoredComment2"),
            plan_from_c3 = D("PlanFromC3"), plan_to_c3 = D("PlanToC3"), plan_recovery_c3 = D("PlanRecoveryC3"), plan_cored_comment3 = S("PlanCoredComment3"),
            hole_mud_plug_from = h.MudPlugFrom, hole_mud_plug_to = h.MudPlugTo, screen_top = h.ScreenTop, screen_bottom = h.ScreenBottom,
            hole_plan_comments = h.PlanComments, plan_start_comment = h.PlanStartComment, plan_stop_comment = h.PlanStopComment,
            error_count = errors, warning_count = warnings, user_name = user
        };
    }

    private const string SelectHoles = "SELECT * FROM stg.STG_COLLAR";
    private const string SelectGeo = "SELECT stg_hole_id, holeid, geol_from, geol_to, litho_planned, caco3_risks FROM stg.STG_GEODETAILS";

    public async Task<IReadOnlyList<Hole>> ListAsync(CancellationToken ct = default)
    {
        await using var cn = db.Staging();
        var holes = (await cn.QueryAsync<HoleRow>(new CommandDefinition(SelectHoles + " ORDER BY holeid", cancellationToken: ct))).ToList();
        var geo = (await cn.QueryAsync<GeoRow>(new CommandDefinition(SelectGeo + " WHERE stg_hole_id IS NOT NULL", cancellationToken: ct))).ToLookup(g => g.stg_hole_id);
        return holes.Select(h => ToHole(h, geo[h.stg_hole_id])).ToList();
    }

    public async Task<Hole?> GetAsync(Guid stagingId, CancellationToken ct = default)
    {
        await using var cn = db.Staging();
        var row = await cn.QuerySingleOrDefaultAsync<HoleRow>(new CommandDefinition(SelectHoles + " WHERE stg_hole_id = @id", new { id = stagingId }, cancellationToken: ct));
        if (row is null) return null;
        var geo = await cn.QueryAsync<GeoRow>(new CommandDefinition(SelectGeo + " WHERE stg_hole_id = @id", new { id = stagingId }, cancellationToken: ct));
        return ToHole(row, geo);
    }

    public async Task<Hole?> FindByHoleIdAsync(string holeId, CancellationToken ct = default)
    {
        await using var cn = db.Staging();
        var id = await cn.ExecuteScalarAsync<Guid?>(new CommandDefinition("SELECT stg_hole_id FROM stg.STG_COLLAR WHERE holeid = @holeId", new { holeId }, cancellationToken: ct));
        return id is null ? null : await GetAsync(id.Value, ct);
    }

    public async Task<Hole> SaveAsync(Hole hole, int errorCount, int warningCount, string user, CancellationToken ct = default)
    {
        var row = ToRow(hole, errorCount, warningCount, user);
        await using var cn = db.Staging();
        await cn.OpenAsync(ct);
        await using var tx = (SqlTransaction)await cn.BeginTransactionAsync(ct);

        var exists = hole.StagingId is not null && await cn.ExecuteScalarAsync<int>(new CommandDefinition(
            "SELECT COUNT(*) FROM stg.STG_COLLAR WHERE stg_hole_id = @stg_hole_id", row, tx, cancellationToken: ct)) > 0;

        if (exists)
        {
            var set = string.Join(", ", DataColumns.Select(c => $"{c} = @{c}"));
            var sql = $"UPDATE stg.STG_COLLAR SET {set}, updated_by = @user_name, updated_at = SYSUTCDATETIME() " +
                      "WHERE stg_hole_id = @stg_hole_id AND (@row_version IS NULL OR row_version = @row_version)";
            if (await cn.ExecuteAsync(new CommandDefinition(sql, row, tx, cancellationToken: ct)) == 0)
                throw new ConcurrencyException("This draft was changed by someone else; reload it.");
        }
        else
        {
            var cols = string.Join(", ", DataColumns);
            var vals = string.Join(", ", DataColumns.Select(c => "@" + c));
            await cn.ExecuteAsync(new CommandDefinition(
                $"INSERT INTO stg.STG_COLLAR (stg_hole_id, {cols}, created_by) VALUES (@stg_hole_id, {vals}, @user_name)", row, tx, cancellationToken: ct));
        }

        await cn.ExecuteAsync(new CommandDefinition("DELETE FROM stg.STG_GEODETAILS WHERE stg_hole_id = @stg_hole_id", row, tx, cancellationToken: ct));
        foreach (var g in hole.Gtn.Where(g => g.From is not null && g.To is not null))
            await cn.ExecuteAsync(new CommandDefinition(
                "INSERT INTO stg.STG_GEODETAILS (stg_hole_id, holeid, geol_from, geol_to, litho_planned, caco3_risks, created_by) " +
                "VALUES (@stg_hole_id, @holeid, @geol_from, @geol_to, @litho_planned, @caco3_risks, @user_name)",
                new GeoRow { stg_hole_id = row.stg_hole_id, holeid = row.holeid, geol_from = g.From!.Value, geol_to = g.To!.Value, litho_planned = g.Lithology, caco3_risks = g.CaCO3Risk, user_name = user },
                tx, cancellationToken: ct));

        await tx.CommitAsync(ct);
        return (await GetAsync(row.stg_hole_id, ct))!;
    }

    public async Task<long?> MaxKeyAsync(CancellationToken ct = default)
    {
        await using var cn = db.Staging();
        return await cn.ExecuteScalarAsync<long?>(new CommandDefinition(
            "SELECT MAX(TRY_CAST(technowell_key AS BIGINT)) FROM stg.STG_COLLAR", cancellationToken: ct));
    }

    public async Task DeleteAsync(Guid stagingId, string user, CancellationToken ct = default)
    {
        await using var cn = db.Staging();
        await cn.ExecuteAsync(new CommandDefinition("DELETE FROM stg.STG_COLLAR WHERE stg_hole_id = @id", new { id = stagingId }, cancellationToken: ct));
    }
}
