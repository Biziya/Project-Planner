using TechnoWells.Core.Configuration;
using TechnoWells.Core.HoleIds;
using TechnoWells.Core.Model;
using TechnoWells.Core.Validation;
using TechnoWells.Core.Services;
using TechnoWells.Core.Workflow;
using Xunit;

namespace TechnoWells.Core.Tests;

internal sealed class FakeLookups : ILookupProvider
{
    private readonly Dictionary<string, List<(string Code, string? Parent)>> _data = new()
    {
        ["L01"] = new() { ("ZOOVCH", null), ("DULAAN UUL", null) },
        ["L02"] = new() { ("ZOOVCH-2026", "ZOOVCH"), ("DULAAN-2026", "DULAAN UUL") },
        ["L05"] = new() { ("UTM_Z49N_Planned", null) },
        ["L06"] = new() { ("Techno", null), ("Hydro", null) },
        ["L07"] = new() { ("INJECTOR", "Techno"), ("PRODUCER", "Techno") },
        ["L09"] = new() { ("RC", null) },
        ["L15"] = new() { ("Clay", null), ("Sand", null) },
    };
    public bool IsAvailable(string lookupId) => _data.ContainsKey(lookupId);
    public bool Exists(string lookupId, string code, string? parent = null) =>
        _data.TryGetValue(lookupId, out var v) && v.Any(e => e.Code == code && (e.Parent is null || parent is null || e.Parent == parent));
}

internal sealed class FakeDirectory : IHoleDirectory
{
    public HashSet<string> InAcquire { get; } = new() { "IZO_449_055_44_A_" };
    public List<(string Id, decimal X, decimal Y)> Positions { get; } = new() { ("IZO_447_054_44_A_", 612418.0m, 4873210.8m) };
    public bool HoleIdExistsInAcquire(string holeId) => InAcquire.Contains(holeId);
    public bool HoleIdExistsInStaging(string holeId, Guid? exceptStagingId) => false;
    public IEnumerable<string> HolesAt(decimal x, decimal y, string cs, string except) =>
        Positions.Where(p => p.X == x && p.Y == y && p.Id != except).Select(p => p.Id);
    public (string HoleId, decimal Distance)? Nearest(decimal x, decimal y, string cs, string except)
    {
        var best = Positions.Where(p => p.Id != except)
            .Select(p => (p.Id, D: (decimal)Math.Sqrt((double)((p.X - x) * (p.X - x) + (p.Y - y) * (p.Y - y)))))
            .OrderBy(t => t.D).FirstOrDefault();
        return best.Id is null ? null : (best.Id, best.D);
    }
    public bool KeyExists(string key, string except) => key == "999";
}

public class CoreTests
{
    private static Hole ValidHole() => new()
    {
        HoleId = "IZO_446_054_44_A_", ProjectCode = "ZOOVCH", Prospect = "ZOOVCH-2026", TechnoWellKey = "1001",
        X = 612345.2m, Y = 4873210.8m, Z = 702.4m, CoordinateSet = "UTM_Z49N_Planned",
        HolePurpose = "Techno", SubPurpose = "INJECTOR", PlanDrillType = "RC", HolePlanDepth = 260m,
        Source = "excel"
    };

    private static ValidationEngine Engine(ValidationSettings? settings = null, IReadOnlyCollection<string>? batch = null) =>
        new(new ValidationContext
        {
            Lookups = new FakeLookups(),
            Directory = new FakeDirectory(),
            Settings = settings ?? new ValidationSettings { SubPurposeLetters = new() { ["INJECTOR"] = "I", ["PRODUCER"] = "P" } },
            BatchHoleIds = batch ?? Array.Empty<string>()
        });

    private static IEnumerable<string> Rules(IEnumerable<Issue> issues) => issues.Select(i => i.Rule);

    // ---------- HOLEID (AT-02)
    [Fact]
    public void Parse_fills_parts()
    {
        var hole = new Hole { HoleId = "izo_446_054_44_a_" };
        Assert.True(new HoleIdParser().ApplyTo(hole));
        Assert.Equal("IZO_446_054_44_A_", hole.HoleId);
        Assert.Equal("IZO", hole.HolePrefix);
        Assert.Equal("446", hole.EastingColumnHexa);
        Assert.Equal("054", hole.NorthingRowHexa);
        Assert.Equal("44_A", hole.DepthBin);
        Assert.Equal("_", hole.BisNumber);
        Assert.Equal("ZOOVCH", hole.ProjectCode);
    }

    [Fact]
    public void Redrilling_has_same_root()
    {
        var p = new HoleIdParser();
        Assert.Equal(p.RootOf("IZO_451_057_44_A_"), p.RootOf("IZO_451_057_44_A2"));
    }

    [Fact]
    public void Cells_and_blocks_are_refused()
    {
        Assert.Null(new HoleIdParser().TryParse("CZO_446_054_44_A_", out var error));
        Assert.Contains("not drillholes", error!);
    }

    // ---------- Slots (AT-10)
    [Fact]
    public void Slots_round_trip()
    {
        var rows = new List<Interval>
        {
            new() { Type = IntervalType.Destructive, From = 0, To = 210 },
            new() { Type = IntervalType.Core, From = 210, To = 240, Recovery = 90, Comment = "Target sand" },
            new() { Type = IntervalType.Destructive, From = 240, To = 260 }
        };
        var slots = IntervalSlots.ToSlots(rows);
        Assert.Equal(240m, slots["PlanFromD2"]);
        Assert.Equal(210m, slots["PlanFromC1"]);
        Assert.Null(slots["PlanFromD3"]);
        var back = IntervalSlots.FromSlots(slots);
        Assert.Equal(3, back.Count);
        Assert.Equal(IntervalType.Core, back[1].Type);
        Assert.Equal("Target sand", back[1].Comment);
    }

    [Fact]
    public void Four_core_intervals_are_refused()
    {
        var hole = ValidHole();
        hole.Intervals = Enumerable.Range(0, 4).Select(i => new Interval { Type = IntervalType.Core, From = i * 10, To = i * 10 + 10 }).ToList();
        Assert.Contains("V-16", Rules(Engine().Validate(hole)));
    }

    // ---------- Status (AT-07, AT-08)
    [Fact]
    public void Only_supervisors_validate_for_drilling()
    {
        Assert.False(StatusRules.CanChange(HoleStatus.PROGRAM_TOVALIDATE, HoleStatus.PROGRAM_VALIDATED, isSupervisor: false).Allowed);
        Assert.True(StatusRules.CanChange(HoleStatus.PROGRAM_TOVALIDATE, HoleStatus.PROGRAM_VALIDATED, isSupervisor: true).Allowed);
        Assert.True(StatusRules.CanChange(HoleStatus.PROGRAM_VALIDATED, HoleStatus.PROJECT, isSupervisor: false).Allowed);
        Assert.False(StatusRules.CanChange(HoleStatus.PROJECT, HoleStatus.PROGRAM_VALIDATED, isSupervisor: true).Allowed);
    }

    // ---------- Validation
    [Fact]
    public void Valid_hole_has_no_issue()
    {
        Assert.Empty(Engine().Validate(ValidHole()));
    }

    [Fact]
    public void Missing_mandatory_fields_are_reported()
    {
        var hole = ValidHole();
        hole.Z = null;
        hole.PlanDrillType = null;
        var issues = Engine().Validate(hole);
        Assert.Equal(2, issues.Count(i => i.Rule == "V-01"));
        Assert.Contains(issues, i => i.Message.StartsWith("Z is missing"));
    }

    [Fact]
    public void Campaign_must_belong_to_project()
    {
        var hole = ValidHole();
        hole.Prospect = "DULAAN-2026";
        Assert.Contains("V-02", Rules(Engine().Validate(hole)));
    }

    [Fact]
    public void Holeid_already_in_acquire_is_refused_for_new_holes()
    {
        var hole = ValidHole();
        hole.HoleId = "IZO_449_055_44_A_";
        Assert.Contains("V-03", Rules(Engine().Validate(hole)));
    }

    [Fact]
    public void Holeid_twice_in_a_file_is_refused()
    {
        var issues = Engine(batch: new[] { "IZO_446_054_44_A_", "IZO_446_054_44_A_" }).Validate(ValidHole());
        Assert.Contains("V-03", Rules(issues));
    }

    [Fact]
    public void Sub_purpose_letter_must_match()
    {
        var hole = ValidHole();
        hole.SubPurpose = "PRODUCER";
        Assert.Contains("V-04", Rules(Engine().Validate(hole)));
    }

    [Fact]
    public void Same_coordinates_as_another_hole_is_refused()
    {
        var hole = ValidHole();
        hole.X = 612418.0m;
        Assert.Contains("V-13", Rules(Engine().Validate(hole)));
    }

    [Fact]
    public void Intervals_must_be_contiguous_and_start_at_zero()
    {
        var hole = ValidHole();
        hole.Intervals = new()
        {
            new() { Type = IntervalType.Destructive, From = 0, To = 210 },
            new() { Type = IntervalType.Core, From = 215, To = 240 }
        };
        Assert.Contains(Engine().Validate(hole), i => i.Rule == "V-07" && i.Message.Contains("previous interval ends at 210"));
    }

    [Fact]
    public void Intervals_can_be_added_later()
    {
        var hole = ValidHole();
        hole.Intervals.Clear();
        Assert.DoesNotContain("V-07", Rules(Engine().Validate(hole)));
    }

    [Fact]
    public void Screen_must_be_within_planned_depth()
    {
        var hole = ValidHole();
        hole.ScreenTop = 214;
        hole.ScreenBottom = 270;
        Assert.Contains("V-08", Rules(Engine().Validate(hole)));
    }

    [Fact]
    public void Gtn_rows_must_not_overlap()
    {
        var hole = ValidHole();
        hole.Gtn = new()
        {
            new() { From = 0, To = 205, Lithology = "Clay", CaCO3Risk = "No" },
            new() { From = 200, To = 245, Lithology = "Sand", CaCO3Risk = "Yes" }
        };
        Assert.Contains("V-12", Rules(Engine().Validate(hole)));
    }

    [Fact]
    public void Failed_needs_a_comment()
    {
        var hole = ValidHole();
        hole.Status = HoleStatus.FAILED;
        Assert.Contains("V-17", Rules(Engine().Validate(hole)));
        hole.FailureComment = "Access road flooded";
        Assert.DoesNotContain("V-17", Rules(Engine().Validate(hole)));
    }

    [Fact]
    public void Key_must_be_unique()
    {
        var hole = ValidHole();
        hole.TechnoWellKey = "999";
        Assert.Contains("V-15", Rules(Engine().Validate(hole)));
    }

    [Fact]
    public void Close_hole_gives_a_warning()
    {
        var hole = ValidHole();
        hole.X = 612416.0m; // 2 m from IZO_447_054_44_A_
        var issues = Engine(new ValidationSettings { MinDistance = 10 }).Validate(hole);
        Assert.Contains(issues, i => i.Rule == "V-10" && i.Level == IssueLevel.Warning);
    }

    // ---------- acQuire mapping (spec 5.3, 6.4, 6.5)
    [Fact]
    public void Attributes_round_trip()
    {
        var hole = ValidHole();
        hole.Status = HoleStatus.PROJECT;
        hole.PlanStartComment = "Start after rains";
        hole.Intervals = new()
        {
            new() { Type = IntervalType.Destructive, From = 0, To = 210 },
            new() { Type = IntervalType.Core, From = 210, To = 240, Recovery = 95, Comment = "Ore" }
        };
        hole.Gtn = new() { new() { From = 0, To = 120, Lithology = "Clay", CaCO3Risk = "No" } };

        var attrs = AcquireMapping.ToAttributes(hole);
        Assert.Contains(new AcquireAttribute("HOLEDETAILS", "PlanFromC1", "210"), attrs);
        Assert.Contains(new AcquireAttribute("HOLEBIGCOMMENT", "PlanCoredComment1", "Ore"), attrs);
        Assert.Contains(new AcquireAttribute("HOLEDETAILS", "HoleStatus", "PROJECT"), attrs);

        var back = new Hole { HoleId = hole.HoleId };
        AcquireMapping.FromAttributes(back, attrs);
        Assert.Equal(2, back.Intervals.Count);
        Assert.Equal(95m, back.Intervals[1].Recovery);
        Assert.Equal("Start after rains", back.PlanStartComment);
        Assert.Equal(HoleStatus.PROJECT, back.Status);

        var geo = AcquireMapping.ToGeoAttributes(hole);
        Assert.Equal(2, geo.Count);
        Assert.True(geo.All(g => g.Priority == 100));
        var gtn = AcquireMapping.FromGeoAttributes(geo);
        Assert.Equal("Clay", gtn[0].Lithology);
    }

    // ---------- GTN fallback: different intervals per attribute (spec 6.5)
    private static Hole HoleWithSplitGtn()
    {
        var hole = ValidHole();
        hole.Gtn = new()
        {
            new() { From = 0, To = 120, Lithology = "Clay" },
            new() { From = 120, To = 245, Lithology = "Sand" },
            new() { From = 0, To = 200, CaCO3Risk = "No" },
            new() { From = 200, To = 245, CaCO3Risk = "Yes" }
        };
        return hole;
    }

    [Fact]
    public void Gtn_split_intervals_refused_when_intervals_are_shared()
    {
        Assert.Contains("V-12", Rules(Engine().Validate(HoleWithSplitGtn())));
    }

    [Fact]
    public void Gtn_split_intervals_accepted_in_fallback_mode()
    {
        var settings = new ValidationSettings { GtnSameIntervals = false, SubPurposeLetters = new() { ["INJECTOR"] = "I" } };
        Assert.Empty(Engine(settings).Validate(HoleWithSplitGtn()));
        var geo = AcquireMapping.ToGeoAttributes(HoleWithSplitGtn());
        Assert.Equal(4, geo.Count); // one GEODETAILS row per filled attribute, nothing written for empty ones
        Assert.Equal(4, AcquireMapping.FromGeoAttributes(geo).Count);
    }

    [Fact]
    public void Gtn_overlap_is_checked_per_attribute_in_fallback_mode()
    {
        var hole = HoleWithSplitGtn();
        hole.Gtn.Add(new() { From = 100, To = 130, Lithology = "Silt" });
        var settings = new ValidationSettings { GtnSameIntervals = false, SubPurposeLetters = new() { ["INJECTOR"] = "I" } };
        Assert.Contains(Engine(settings).Validate(hole), i => i.Rule == "V-12" && i.Message.StartsWith("Lithology rows"));
    }

    // ---------- KEY: whole number, suggestion = highest KEY of all holes + 1
    [Fact]
    public void Key_must_be_a_whole_number()
    {
        var hole = ValidHole();
        hole.TechnoWellKey = "K12";
        Assert.Contains(Engine().Validate(hole), i => i.Rule == "V-15" && i.Message.Contains("whole number"));
    }

    private sealed class KeyStaging(long? max) : IStagingRepository
    {
        public Task<long?> MaxKeyAsync(CancellationToken ct = default) => Task.FromResult(max);
        public Task<IReadOnlyList<Hole>> ListAsync(CancellationToken ct = default) => throw new NotSupportedException();
        public Task<Hole?> GetAsync(Guid id, CancellationToken ct = default) => throw new NotSupportedException();
        public Task<Hole?> FindByHoleIdAsync(string h, CancellationToken ct = default) => throw new NotSupportedException();
        public Task<Hole> SaveAsync(Hole h, int e, int w, string u, CancellationToken ct = default) => throw new NotSupportedException();
        public Task DeleteAsync(Guid id, string u, CancellationToken ct = default) => throw new NotSupportedException();
    }

    private sealed class KeyAcquire(bool available, long? max) : IAcquireReadRepository
    {
        public Task<(bool Available, long? Max)> MaxKeyAsync(CancellationToken ct = default) => Task.FromResult((available, max));
        public Task<IReadOnlyList<HoleSummary>> ListProgramHolesAsync(HoleFilter f, CancellationToken ct = default) => throw new NotSupportedException();
        public Task<Hole?> GetHoleAsync(string h, CancellationToken ct = default) => throw new NotSupportedException();
    }

    [Fact]
    public async Task Suggested_key_combines_acquire_and_staging()
    {
        var s = await new KeySuggestionService(new KeyStaging(1043), new KeyAcquire(true, 1040)).SuggestAsync();
        Assert.Equal(1044L, s.Suggested);
        var s2 = await new KeySuggestionService(new KeyStaging(1043), new KeyAcquire(true, 2000)).SuggestAsync();
        Assert.Equal(2001L, s2.Suggested);
        var s3 = await new KeySuggestionService(new KeyStaging(null), new KeyAcquire(false, null)).SuggestAsync();
        Assert.Equal(1L, s3.Suggested);
        Assert.False(s3.AcquireIncluded);
    }

    // ---------- acquire-queries.sql loader
    private sealed class QueryOptions { public string ListProgramHoles { get; set; } = ""; public string InsertGtn { get; set; } = "default"; }

    [Fact]
    public void Query_file_is_split_by_markers_and_commented_queries_stay_empty()
    {
        var text = "/* header */\n-- @query ListProgramHoles\nSELECT 1\n-- @query InsertGtn\n/* INSERT INTO x VALUES (1) */\n";
        var q = SqlQueryFile.Parse(text);
        Assert.Equal("SELECT 1", q["ListProgramHoles"]);
        var o = new QueryOptions();
        SqlQueryFile.ApplyTo(o, q, "test.sql");
        Assert.Equal("SELECT 1", o.ListProgramHoles);
        Assert.Equal("default", o.InsertGtn); // only comments: not applied
    }

    [Fact]
    public void Same_coordinates_can_be_a_warning_only()
    {
        var hole = ValidHole();
        hole.X = 612418.0m;
        var settings = new ValidationSettings { SameCoordinatesLevel = IssueLevel.Warning, SubPurposeLetters = new() { ["INJECTOR"] = "I" } };
        Assert.Contains(Engine(settings).Validate(hole), i => i.Rule == "V-13" && i.Level == IssueLevel.Warning);
    }

    [Fact]
    public void Coordinate_sets_of_the_same_grid_are_compared()
    {
        Assert.Equal("UTM_Z49N", CoordinateSets.GridOf("UTM_Z49N_Planned"));
        Assert.True(CoordinateSets.SameGrid("UTM_Z49N_Planned", "UTM_Z49N_Surveyed"));
        Assert.True(CoordinateSets.SameGrid("UTM_Z49N_Planned", "utm_z49n_pegged"));
        Assert.False(CoordinateSets.SameGrid("UTM_Z49N_Planned", "UTM_Z50N_Planned"));
    }
}
