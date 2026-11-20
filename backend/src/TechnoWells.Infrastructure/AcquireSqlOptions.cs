namespace TechnoWells.Infrastructure;

/// <summary>
/// SQL used to read from and write to acQuire. Kept in configuration because the acQuire attribute storage
/// and the load path are open points (spec 10, 12): the acQuire administrator fills or adjusts these texts
/// without code changes. Parameters are passed by name (@HoleId, @Name…).
/// </summary>
public sealed class AcquireSqlOptions
{
    /// <summary>Optional .sql file holding the queries below ("-- @query Name" blocks), relative to the application folder.
    /// Queries found in the file replace the values of appsettings.json.</summary>
    public string QueriesFile { get; set; } = "";

    // ---------------- Reads -------------------------------------------------
    /// <summary>Holes for the Edit Program list. Columns: HoleId, Status, ProjectCode, Prospect, HolePurpose, HolePlanTarget, X, Y, Z.
    /// Optional filters as parameters (@Search, @Status, @Project, @Prospect, @Purpose, @Target; NULL = no filter).</summary>
    public string ListProgramHoles { get; set; } = "";

    /// <summary>Columns of one hole. Columns: HoleId, ProjectCode, Prospect, TenementId, CoordinateSet, X, Y, Z.</summary>
    public string HoleColumns { get; set; } = """
        SELECT l.HOLEID AS HoleId, l.PROJECTCODE AS ProjectCode, l.PROSPECT AS Prospect, l.TENEMENTID AS TenementId,
               c.COORDINATESET AS CoordinateSet, c.X, c.Y, c.Z
          FROM dbo.HOLELOCATION l
          LEFT JOIN dbo.HOLECOORD c ON c.HOLEID = l.HOLEID AND c.COORDINATESET LIKE '%[_]Planned'
         WHERE l.HOLEID = @HoleId
        """;

    /// <summary>Attributes of one hole. Columns: TableName, Name, Value (HOLEDETAILS, HOLECOMMENT, HOLEBIGCOMMENT). TO ADAPT to the acQuire schema.</summary>
    public string HoleAttributes { get; set; } = "";

    /// <summary>Planned GTN of one hole. Columns: GeolFrom, GeolTo, Name, Value, Priority. TO ADAPT.</summary>
    public string HoleGtn { get; set; } = "";

    /// <summary>Version token of a hole (row version or last-modified timestamp), as text. TO ADAPT.</summary>
    public string HoleVersion { get; set; } = "";

    /// <summary>Returns 1 when the HOLEID exists.</summary>
    public string HoleExists { get; set; } = "SELECT CASE WHEN EXISTS (SELECT 1 FROM dbo.HOLELOCATION WHERE HOLEID = @HoleId) THEN 1 ELSE 0 END";

    /// <summary>Holes near a point in ALL coordinate sets of the same grid (V-10, V-13). Columns: HoleId, X, Y.
    /// Parameters @X, @Y, @Radius, @Grid (e.g. UTM_Z49N) and @CoordinateSet (the hole's own set).</summary>
    public string HolesNear { get; set; } = """
        SELECT HOLEID AS HoleId, X, Y FROM dbo.HOLECOORD
         WHERE COORDINATESET LIKE @Grid + '[_]%' AND X BETWEEN @X - @Radius AND @X + @Radius AND Y BETWEEN @Y - @Radius AND @Y + @Radius
        """;

    /// <summary>Highest numeric KEY (TechnoWellKey) among ALL holes, whatever their status. One value (BIGINT or NULL).
    /// e.g. SELECT MAX(TRY_CAST(VALUE AS BIGINT)) FROM ... WHERE NAME = 'TechnoWellKey'. TO ADAPT.</summary>
    public string MaxKey { get; set; } = "";

    /// <summary>Returns 1 when another hole uses the KEY (V-15). Parameters @Key, @HoleId. TO ADAPT.</summary>
    public string KeyExists { get; set; } = "";

    // ---------------- Writes (load path, spec 10) ---------------------------
    // Run inside one transaction, after an application lock on the HOLEID (sp_getapplock).
    // Point them at the load path agreed with the acQuire administrator (import tables or procedures).
    // Empty = not configured: sending to acQuire is refused with a clear message.

    /// <summary>Parameters: @HoleId, @ProjectCode, @Prospect, @TenementId, @Grid (e.g. UTM_Z49N, for GRIDNAME).</summary>
    public string InsertLocation { get; set; } = "";
    public string UpdateLocation { get; set; } = "";
    /// <summary>Parameters: @HoleId, @ProjectCode, @CoordinateSet, @X, @Y, @Z.</summary>
    public string UpsertCoord { get; set; } = "";
    /// <summary>One call per attribute. Parameters: @HoleId, @ProjectCode, @TableName, @Name, @Value (NULL clears it).</summary>
    public string UpsertAttribute { get; set; } = "";
    /// <summary>Deletes the planned GTN rows of a hole (attributes LithoPlanned and CACO3_Risks). Parameters: @HoleId, @ProjectCode.</summary>
    public string DeletePlannedGtn { get; set; } = "";
    /// <summary>One call per GTN attribute. Parameters: @HoleId, @ProjectCode, @GeolFrom, @GeolTo, @Name, @Value, @Priority.</summary>
    public string InsertGtn { get; set; } = "";

    public bool WritesConfigured =>
        !string.IsNullOrWhiteSpace(InsertLocation) && !string.IsNullOrWhiteSpace(UpdateLocation) && !string.IsNullOrWhiteSpace(UpsertCoord)
        && !string.IsNullOrWhiteSpace(UpsertAttribute) && !string.IsNullOrWhiteSpace(DeletePlannedGtn) && !string.IsNullOrWhiteSpace(InsertGtn);

    /// <summary>Lookup cache duration in minutes (L-03).</summary>
    public int LookupCacheMinutes { get; set; } = 5;
}
