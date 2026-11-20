namespace TechnoWells.Core.Model;

/// <summary>Statuses used by the app (spec 2.2). Preparation exists only in staging.</summary>
public enum HoleStatus
{
    Preparation,
    PROJECT,
    PROGRAM_TOVALIDATE,
    PROGRAM_VALIDATED,
    FAILED
}

/// <summary>Interval type exists only in the UI; in acQuire it decides the slot (D1–D4 or C1–C3).</summary>
public enum IntervalType
{
    Destructive,
    Core
}

public sealed class Interval
{
    public IntervalType Type { get; set; }
    public decimal? From { get; set; }
    public decimal? To { get; set; }
    /// <summary>Core recovery in %, core rows only.</summary>
    public decimal? Recovery { get; set; }
    /// <summary>End of range comment, core rows only.</summary>
    public string? Comment { get; set; }
}

/// <summary>One planned GTN interval (GEODETAILS).</summary>
public sealed class GtnRow
{
    public decimal? From { get; set; }
    public decimal? To { get; set; }
    public string? Lithology { get; set; }
    /// <summary>"Yes" or "No".</summary>
    public string? CaCO3Risk { get; set; }
}

/// <summary>
/// A drillhole as edited in the app. Field numbers refer to table 5.2 of the specification.
/// </summary>
public sealed class Hole
{
    // Technical
    public Guid? StagingId { get; set; }
    public string Source { get; set; } = "form";          // form | excel | acquire
    public byte[]? RowVersion { get; set; }                // staging optimistic concurrency
    public string? AcquireVersion { get; set; }            // version read from acQuire (X-05)

    // Drillhole header (1–12)
    public string HoleId { get; set; } = "";              // 1
    public string? BisNumber { get; set; }                 // 2 auto
    public string? ProjectCode { get; set; }               // 3
    public string? Prospect { get; set; }                  // 4 (Campaign)
    public string? TenementId { get; set; }                // 5
    public HoleStatus Status { get; set; } = HoleStatus.Preparation; // 6
    public string? FailureComment { get; set; }            // 7
    public string? DepthBin { get; set; }                  // 8 auto
    public string? TechnoWellKey { get; set; }             // 9 (KEY)
    public string? HolePrefix { get; set; }                // 10 auto
    public string? EastingColumnHexa { get; set; }         // 11 auto
    public string? NorthingRowHexa { get; set; }           // 12 auto

    // Planned coordinates and direction (13–18)
    public decimal? X { get; set; }
    public decimal? Y { get; set; }
    public decimal? Z { get; set; }
    public string? CoordinateSet { get; set; }
    public decimal? Azimuth { get; set; }
    public decimal? Dip { get; set; }

    // Picket details (19–31)
    public string? HolePurpose { get; set; }
    public string? SubPurpose { get; set; }
    public string? HolePlanTarget { get; set; }
    public DateOnly? HolePlanDate { get; set; }
    public string? PlanDrillType { get; set; }
    public decimal? HolePlanDepth { get; set; }
    public decimal? MaxDeviation { get; set; }
    public string? ChiefGeologist { get; set; }
    public string? TechnicGeologist { get; set; }
    public string? DrillMaster { get; set; }
    public string? DrillRig { get; set; }
    public string? DrillCompany { get; set; }
    public string? AssociatedCells { get; set; }

    // Drilling construction planned (32–46)
    public List<Interval> Intervals { get; set; } = new();
    public decimal? MudPlugFrom { get; set; }
    public decimal? MudPlugTo { get; set; }
    public decimal? ScreenTop { get; set; }
    public decimal? ScreenBottom { get; set; }
    public string? PlanComments { get; set; }
    public string? PlanStartComment { get; set; }
    public string? PlanStopComment { get; set; }

    // GTN panel (47–50)
    public List<GtnRow> Gtn { get; set; } = new();
}
