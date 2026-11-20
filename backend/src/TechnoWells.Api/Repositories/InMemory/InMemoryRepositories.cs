using System.Collections.Concurrent;
using System.Text.Json;
using TechnoWells.Core.Model;
using TechnoWells.Core.Validation;

namespace TechnoWells.Api.Repositories.InMemory;

/// <summary>
/// Sample data and in-memory stores, used when Storage:Mode = InMemory (development, demos, front-end work).
/// Same behaviour as the SQL implementation: HOLEID reservation, version checks, interval slots.
/// </summary>
public sealed class InMemoryData
{
    public readonly object Gate = new();
    public readonly Dictionary<Guid, Hole> Staging = new();
    public readonly Dictionary<string, (Hole Hole, int Version)> Acquire = new(StringComparer.OrdinalIgnoreCase);
    public readonly ConcurrentQueue<AuditEntry> Audit = new();
    public readonly Dictionary<string, List<LookupItem>> Lookups = new()
    {
        ["L01"] = new() { new("ZOOVCH", "Zoovch", null), new("DULAAN UUL", "Dulaan Uul", null) },
        ["L02"] = new() { new("ZOOVCH-2026", "Zoovch 2026", "ZOOVCH"), new("ZOOVCH-2027", "Zoovch 2027", "ZOOVCH"), new("DULAAN UUL-2026", "Dulaan Uul 2026", "DULAAN UUL") },
        ["L03"] = new() { new("10860X", "10860X", null), new("12345A", "12345A", null) },
        ["L04"] = new() { new("PROJECT", "Project", null), new("PROGRAM_TOVALIDATE", "Program to validate", null), new("PROGRAM_VALIDATED", "Program validated", null), new("FAILED", "Failed", null) },
        ["L05"] = new() { new("UTM_Z49N_Planned", "UTM zone 49N, planned", null), new("UTM_Z50N_Planned", "UTM zone 50N, planned", null) },
        ["L06"] = new() { new("Hydro", "Hydro", null), new("Techno", "Techno", null), new("Hybrid", "Hybrid", null) },
        ["L07"] = new() { new("PRODUCER", "Producer (P)", "Techno"), new("INJECTOR", "Injector (I)", "Techno"), new("UNIVERSAL", "Universal (U)", "Techno"), new("MONITORING", "Monitoring (M)", "Hydro") },
        ["L08"] = new() { new("K2Ss2-U1", "K2Ss2-U1", null), new("K2Ss2-U2", "K2Ss2-U2", null) },
        ["L09"] = new() { new("RC", "Reverse circulation", null), new("RT", "Rotary", null), new("DC", "Diamond core", null) },
        ["L10"] = new() { new("BATAA", "Bataa (chief geologist)", null) },
        ["L11"] = new() { new("SARNAI", "Sarnai", null) },
        ["L12"] = new() { new("GANBOLD", "Ganbold", null) },
        ["L13"] = new() { new("BL38_AIDD", "BL38 AIDD", null) },
        ["L14"] = new() { new("AIDD", "AIDD", null), new("GANDRILLING", "Gan Drilling", null) },
        ["L15"] = new() { new("Clay", "Clay", null), new("Silt", "Silt", null), new("Sand", "Sand", null), new("Gravel", "Gravel", null) },
        ["L16"] = new() { new("Yes", "Yes", null), new("No", "No", null) },
    };

    public InMemoryData()
    {
        Hole H(string id, HoleStatus s, decimal x, decimal y, decimal z, string sub, string key) => new()
        {
            HoleId = id, Status = s, ProjectCode = "ZOOVCH", Prospect = "ZOOVCH-2026", TenementId = "10860X", TechnoWellKey = key,
            X = x, Y = y, Z = z, CoordinateSet = "UTM_Z49N_Planned", Azimuth = 0, Dip = -90, HolePurpose = "Techno", SubPurpose = sub,
            HolePlanTarget = "K2Ss2-U1", PlanDrillType = "RC", HolePlanDepth = 260, Source = "acquire",
            HolePrefix = id[..3], EastingColumnHexa = id[4..7], NorthingRowHexa = id[8..11], DepthBin = id[12..16], BisNumber = id[16..],
            Intervals = new()
            {
                new() { Type = IntervalType.Destructive, From = 0, To = 210 },
                new() { Type = IntervalType.Core, From = 210, To = 240, Recovery = 90, Comment = "Target sand" },
                new() { Type = IntervalType.Destructive, From = 240, To = 260 }
            },
            ScreenTop = 214, ScreenBottom = 238,
            Gtn = new() { new() { From = 0, To = 120, Lithology = "Clay", CaCO3Risk = "No" }, new() { From = 120, To = 205, Lithology = "Silt", CaCO3Risk = "No" }, new() { From = 205, To = 245, Lithology = "Sand", CaCO3Risk = "Yes" } }
        };
        foreach (var h in new[]
        {
            H("IZO_446_054_44_A_", HoleStatus.PROJECT, 612345.2m, 4873210.8m, 702.4m, "INJECTOR", "1001"),
            H("IZO_447_054_44_A_", HoleStatus.PROJECT, 612418.0m, 4873210.8m, 702.1m, "INJECTOR", "1002"),
            H("PZO_446_055_44_A_", HoleStatus.PROGRAM_TOVALIDATE, 612381.6m, 4873273.8m, 702.9m, "PRODUCER", "1003"),
            H("IZO_449_055_44_A_", HoleStatus.PROGRAM_TOVALIDATE, 612600.0m, 4873273.8m, 703.2m, "INJECTOR", "1004"),
            H("PZO_448_056_45_A_", HoleStatus.PROJECT, 612527.2m, 4873336.8m, 701.7m, "PRODUCER", "1005"),
            H("IZO_451_057_44_A2", HoleStatus.PROJECT, 612745.6m, 4873399.8m, 702.0m, "INJECTOR", "1006"),
            H("IZO_440_050_44_A_", HoleStatus.FAILED, 611900.0m, 4872958.8m, 701.0m, "INJECTOR", "1040"), // not listed, but its KEY and position count
        }) Acquire[h.HoleId] = (h, 1);
        Acquire["IZO_440_050_44_A_"].Hole.CoordinateSet = "UTM_Z49N_Surveyed"; // measured position: same grid, other method

        Hole S(string id, decimal x, decimal y, decimal? z, string sub, string key) => new()
        {
            StagingId = Guid.NewGuid(), HoleId = id, Status = HoleStatus.Preparation, Source = "excel", ProjectCode = "ZOOVCH", Prospect = "ZOOVCH-2026",
            TechnoWellKey = key, X = x, Y = y, Z = z, CoordinateSet = "UTM_Z49N_Planned", HolePurpose = "Techno",
            SubPurpose = sub, PlanDrillType = "RC", HolePlanDepth = 260, RowVersion = BitConverter.GetBytes(1L),
            HolePrefix = id[..3], EastingColumnHexa = id[4..7], NorthingRowHexa = id[8..11], DepthBin = id[12..16], BisNumber = id[16..]
        };
        foreach (var s in new[]
        {
            S("IZO_453_058_44_A_", 612891.2m, 4873462.8m, 702.2m, "INJECTOR", "1041"),
            S("IZO_454_058_44_A_", 612964.0m, 4873462.8m, 702.5m, "INJECTOR", "1042"),
            S("PZO_455_059_44_A_", 613000.4m, 4873525.8m, null, "PRODUCER", "1043"),
            S("IZO_449_055_44_A_", 612601.5m, 4873273.8m, 703.1m, "INJECTOR", "1004"),
        }) Staging[s.StagingId!.Value] = s;
    }

    public static Hole Clone(Hole h) => JsonSerializer.Deserialize<Hole>(JsonSerializer.Serialize(h))!;
}

public sealed class InMemoryLookupRepository(InMemoryData data) : ILookupRepository
{
    public IReadOnlyList<LookupItem> Get(string lookupId, string? parent = null) =>
        data.Lookups.TryGetValue(lookupId, out var l) ? l.Where(i => parent is null || i.Parent is null || i.Parent == parent).ToList() : Array.Empty<LookupItem>();
    public bool IsAvailable(string lookupId) => data.Lookups.ContainsKey(lookupId);
    public bool Exists(string lookupId, string code, string? parent = null) =>
        Get(lookupId).Any(i => i.Code == code && (parent is null || i.Parent is null || i.Parent == parent));
}

public sealed class InMemoryStagingRepository(InMemoryData data) : IStagingRepository
{
    public Task<IReadOnlyList<Hole>> ListAsync(CancellationToken ct = default)
    { lock (data.Gate) return Task.FromResult<IReadOnlyList<Hole>>(data.Staging.Values.OrderBy(h => h.HoleId).Select(InMemoryData.Clone).ToList()); }

    public Task<Hole?> GetAsync(Guid id, CancellationToken ct = default)
    { lock (data.Gate) return Task.FromResult(data.Staging.TryGetValue(id, out var h) ? InMemoryData.Clone(h) : null); }

    public Task<Hole?> FindByHoleIdAsync(string holeId, CancellationToken ct = default)
    { lock (data.Gate) return Task.FromResult(data.Staging.Values.Where(h => string.Equals(h.HoleId, holeId, StringComparison.OrdinalIgnoreCase)).Select(InMemoryData.Clone).FirstOrDefault()); }

    public Task<Hole> SaveAsync(Hole hole, int errorCount, int warningCount, string user, CancellationToken ct = default)
    {
        lock (data.Gate)
        {
            if (hole.StagingId is Guid id && data.Staging.TryGetValue(id, out var existing))
            {
                if (hole.RowVersion is not null && existing.RowVersion is not null && !hole.RowVersion.SequenceEqual(existing.RowVersion))
                    throw new ConcurrencyException("This draft was changed by someone else; reload it.");
                hole.RowVersion = BitConverter.GetBytes(BitConverter.ToInt64(existing.RowVersion ?? new byte[8]) + 1);
            }
            else
            {
                hole.StagingId ??= Guid.NewGuid();
                hole.RowVersion = BitConverter.GetBytes(1L);
            }
            data.Staging[hole.StagingId!.Value] = InMemoryData.Clone(hole);
            return Task.FromResult(InMemoryData.Clone(hole));
        }
    }

    public Task DeleteAsync(Guid id, string user, CancellationToken ct = default)
    { lock (data.Gate) data.Staging.Remove(id); return Task.CompletedTask; }

    public Task<long?> MaxKeyAsync(CancellationToken ct = default)
    { lock (data.Gate) return Task.FromResult(data.Staging.Values.Select(h => long.TryParse(h.TechnoWellKey, out var k) ? k : (long?)null).Max()); }
}

public sealed class InMemoryAcquireRepository(InMemoryData data) : IAcquireReadRepository, IAcquireWriteRepository
{
    public Task<IReadOnlyList<HoleSummary>> ListProgramHolesAsync(HoleFilter f, CancellationToken ct = default)
    {
        lock (data.Gate)
        {
            var list = data.Acquire.Values.Select(v => v.Hole)
                .Where(h => h.Status is HoleStatus.PROJECT or HoleStatus.PROGRAM_TOVALIDATE or HoleStatus.PROGRAM_VALIDATED)
                .Where(h => f.Status is null || h.Status == f.Status)
                .Where(h => string.IsNullOrEmpty(f.Search) || h.HoleId.Contains(f.Search, StringComparison.OrdinalIgnoreCase))
                .Where(h => string.IsNullOrEmpty(f.ProjectCode) || h.ProjectCode == f.ProjectCode)
                .Where(h => string.IsNullOrEmpty(f.Prospect) || h.Prospect == f.Prospect)
                .Where(h => string.IsNullOrEmpty(f.Purpose) || h.HolePurpose == f.Purpose)
                .Where(h => string.IsNullOrEmpty(f.Target) || h.HolePlanTarget == f.Target)
                .OrderBy(h => h.HoleId)
                .Select(h => new HoleSummary(h.HoleId, h.Status, h.ProjectCode, h.Prospect, h.HolePurpose, h.HolePlanTarget, h.X, h.Y, h.Z))
                .ToList();
            return Task.FromResult<IReadOnlyList<HoleSummary>>(list);
        }
    }

    public Task<Hole?> GetHoleAsync(string holeId, CancellationToken ct = default)
    {
        lock (data.Gate)
        {
            if (!data.Acquire.TryGetValue(holeId, out var v)) return Task.FromResult<Hole?>(null);
            var h = InMemoryData.Clone(v.Hole);
            h.AcquireVersion = v.Version.ToString();
            h.Source = "acquire";
            return Task.FromResult<Hole?>(h);
        }
    }

    public Task<(bool Available, long? Max)> MaxKeyAsync(CancellationToken ct = default)
    {
        lock (data.Gate) // all holes, whatever their status
            return Task.FromResult((true, data.Acquire.Values.Select(v => long.TryParse(v.Hole.TechnoWellKey, out var k) ? k : (long?)null).Max()));
    }

    public Task<WriteResult> CreateAsync(Hole hole, string user, CancellationToken ct = default)
    {
        lock (data.Gate) // reservation and write in one step (D-06)
        {
            if (data.Acquire.TryGetValue(hole.HoleId, out var existing))
                return Task.FromResult(new WriteResult(WriteOutcome.Conflict, $"HOLEID {hole.HoleId} already exists in acQuire.", InMemoryData.Clone(existing.Hole)));
            var copy = InMemoryData.Clone(hole);
            copy.StagingId = null; copy.Source = "acquire"; copy.Status = HoleStatus.PROJECT;
            data.Acquire[hole.HoleId] = (copy, 1);
            return Task.FromResult(WriteResult.Ok);
        }
    }

    public Task<WriteResult> UpdateAsync(Hole hole, string expectedVersion, string user, CancellationToken ct = default)
    {
        lock (data.Gate)
        {
            if (!data.Acquire.TryGetValue(hole.HoleId, out var current))
                return Task.FromResult(new WriteResult(WriteOutcome.Refused, $"Hole {hole.HoleId} is not in acQuire."));
            if (current.Version.ToString() != expectedVersion)
                return Task.FromResult(new WriteResult(WriteOutcome.Conflict, "This hole changed in acQuire since you opened it.", InMemoryData.Clone(current.Hole)));
            data.Acquire[hole.HoleId] = (InMemoryData.Clone(hole), current.Version + 1);
            return Task.FromResult(WriteResult.Ok);
        }
    }

    public Task<WriteResult> ForceUpdateAsync(Hole hole, string user, CancellationToken ct = default)
    {
        lock (data.Gate)
        {
            var v = data.Acquire.TryGetValue(hole.HoleId, out var c) ? c.Version + 1 : 1;
            var copy = InMemoryData.Clone(hole);
            copy.StagingId = null; copy.Source = "acquire";
            data.Acquire[hole.HoleId] = (copy, v);
            return Task.FromResult(WriteResult.Ok);
        }
    }
}

public sealed class InMemoryHoleDirectory(InMemoryData data) : IHoleDirectory
{
    private IEnumerable<Hole> All() { lock (data.Gate) return data.Acquire.Values.Select(v => v.Hole).Concat(data.Staging.Values).ToList(); }

    public bool HoleIdExistsInAcquire(string holeId) { lock (data.Gate) return data.Acquire.ContainsKey(holeId); }
    public bool HoleIdExistsInStaging(string holeId, Guid? except)
    { lock (data.Gate) return data.Staging.Values.Any(h => h.StagingId != except && string.Equals(h.HoleId, holeId, StringComparison.OrdinalIgnoreCase)); }
    public IEnumerable<string> HolesAt(decimal x, decimal y, string cs, string except) =>
        All().Where(h => h.X == x && h.Y == y && CoordinateSets.SameGrid(h.CoordinateSet, cs) && h.HoleId != except).Select(h => h.HoleId).Distinct();
    public (string HoleId, decimal Distance)? Nearest(decimal x, decimal y, string cs, string except)
    {
        var best = All().Where(h => h.X is not null && h.Y is not null && CoordinateSets.SameGrid(h.CoordinateSet, cs) && h.HoleId != except)
            .Select(h => (h.HoleId, D: (decimal)Math.Sqrt((double)((h.X!.Value - x) * (h.X.Value - x) + (h.Y!.Value - y) * (h.Y.Value - y)))))
            .OrderBy(t => t.D).FirstOrDefault();
        return best.HoleId is null ? null : (best.HoleId, best.D);
    }
    public bool KeyExists(string key, string except) => All().Any(h => h.TechnoWellKey == key && h.HoleId != except);
}

public sealed class InMemoryAuditRepository(InMemoryData data) : IAuditRepository
{
    public Task WriteAsync(IEnumerable<AuditEntry> entries, CancellationToken ct = default)
    {
        foreach (var e in entries) data.Audit.Enqueue(e);
        return Task.CompletedTask;
    }
}
