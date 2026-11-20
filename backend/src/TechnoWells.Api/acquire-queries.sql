/* =============================================================================
   TechnoWells – acQuire queries (AcquireSql section)
   -----------------------------------------------------------------------------
   HOW IT WORKS
   - The application reads this file at start-up when appsettings contains:
         "AcquireSql": { "QueriesFile": "acquire-queries.sql" }
   - Each query starts with a line  -- @query QueryName  (nothing else on that line)
     and ends at the next "-- @query" line. Do not rename the queries.
   - An empty query (or one that is only comments) = not configured:
     the application reports it instead of failing.
   - Parameters (@HoleId, @ProjectCode, @Key…) are supplied by the application.
     Keep the names of the returned COLUMNS (AS HoleId, AS Status…) unchanged.

   TABLE KEYS
   Every acQuire table is linked to the collar (HOLELOCATION) by HOLEID + PROJECTCODE.
   Writes always receive @ProjectCode.

   TEST IN SSMS
   Select the DECLARE block below + ONE query, then press F5.
   Text above the first "-- @query" line is ignored by the application.
   ============================================================================= */

/* --- Test parameters (select them together with the query to test) ----------- */
USE ACQMN01_DEV;
DECLARE @HoleId        NVARCHAR(30)  = 'TEST_Jeanne_2';
DECLARE @Search        NVARCHAR(30)  = NULL;      -- NULL = no filter
DECLARE @Status        NVARCHAR(30)  = NULL;
DECLARE @Project       NVARCHAR(30)  = 'ZOOVCH';  -- filter of ListProgramHoles only
DECLARE @Prospect      NVARCHAR(50)  = 'ZOOVCH OVOO - 2026';
DECLARE @Purpose       NVARCHAR(30)  = NULL;
DECLARE @Target        NVARCHAR(30)  = NULL;
DECLARE @Key           NVARCHAR(50)  = '1002';
DECLARE @X DECIMAL(12,3) = 600005, @Y DECIMAL(12,3) = 40005, @Z DECIMAL(8,3) = 750;
DECLARE @CoordinateSet NVARCHAR(50)  = 'UTM_Z49N_Planned';
DECLARE @Grid          NVARCHAR(50)  = 'UTM_Z49N';  -- coordinate set without the measurement method
DECLARE @Radius        DECIMAL(9,3)  = 10;
-- writes
DECLARE @ProjectCode   NVARCHAR(30)  = 'ZOOVCH';
DECLARE @TenementId    NVARCHAR(30)  = '11946X';
DECLARE @TableName     NVARCHAR(30)  = 'HOLEDETAILS';
DECLARE @Name          NVARCHAR(50)  = 'HolePurpose';
DECLARE @Value         NVARCHAR(MAX) = 'INJECT';
DECLARE @GeolFrom DECIMAL(7,2) = 0, @GeolTo DECIMAL(7,2) = 120, @Priority INT = 100;
-------------------------------------------------------------------------------- */


/* =============================================================================
   PART 1 – READS (SELECT only)
   ============================================================================= */

-- @query ListProgramHoles
/* List of the Edit program page: holes in PROJECT or PROGRAM_TOVALIDATE.
   Returned columns: HoleId, Status, ProjectCode, Prospect, HolePurpose, HolePlanTarget, X, Y, Z
   Filters: each parameter NULL = no filter.
   Status is the HOLEDETAILS attribute 'HoleStatus'.
   Exploration and development holes are excluded (HolePurpose EXPLO, DEVELOP);
   holes without a HolePurpose are excluded too. */
SELECT l.HOLEID       AS HoleId,
       st.VALUE       AS Status,
       l.PROJECTCODE  AS ProjectCode,
       l.PROSPECT     AS Prospect,
       pu.VALUE       AS HolePurpose,
       tg.VALUE       AS HolePlanTarget,
       c.X, c.Y, c.Z
  FROM dbo.HOLELOCATION l
  JOIN dbo.HOLEDETAILS st      ON st.HOLEID = l.HOLEID AND st.NAME = 'HoleStatus'
  LEFT JOIN dbo.HOLEDETAILS pu ON pu.HOLEID = l.HOLEID AND pu.NAME = 'HolePurpose'
  LEFT JOIN dbo.HOLEDETAILS tg ON tg.HOLEID = l.HOLEID AND tg.NAME = 'HolePlanTarget'
  LEFT JOIN dbo.HOLECOORD c    ON c.HOLEID  = l.HOLEID AND c.COORDINATESET LIKE '%[_]Planned'
 WHERE st.VALUE IN ('PROJECT', 'PROGRAM_TOVALIDATE')
   AND (@Search   IS NULL OR l.HOLEID LIKE '%' + @Search + '%')
   AND (@Status   IS NULL OR st.VALUE = @Status)
   AND (@Project  IS NULL OR l.PROJECTCODE = @Project)
   AND (@Prospect IS NULL OR l.PROSPECT = @Prospect)
   AND (@Purpose  IS NULL OR pu.VALUE = @Purpose)
   AND (@Target   IS NULL OR tg.VALUE = @Target)
   AND NOT pu.VALUE IN ('EXPLO', 'DEVELOP')
 ORDER BY l.HOLEID

-- @query HoleColumns
/* Columns of one hole. Returned columns: HoleId, ProjectCode, Prospect, TenementId, CoordinateSet, X, Y, Z
   Must return ONE row: a hole can have several coordinate sets (Planned, Pegged, Surveyed…),
   so the Planned position is taken first, otherwise the first other one. */
SELECT l.HOLEID AS HoleId, l.PROJECTCODE AS ProjectCode, l.PROSPECT AS Prospect, l.TENEMENTID AS TenementId,
       c.COORDINATESET AS CoordinateSet, c.X, c.Y, c.Z
  FROM dbo.HOLELOCATION l
  OUTER APPLY (
        SELECT TOP 1 hc.COORDINATESET, hc.X, hc.Y, hc.Z
          FROM dbo.HOLECOORD hc
         WHERE hc.HOLEID = l.HOLEID
         ORDER BY CASE WHEN hc.COORDINATESET LIKE '%[_]Planned' THEN 0 ELSE 1 END, hc.COORDINATESET
       ) c
 WHERE l.HOLEID = @HoleId

-- @query HoleAttributes
/* All attributes of one hole (HOLEDETAILS, HOLECOMMENT, HOLEBIGCOMMENT).
   Returned columns: TableName, Name, Value. Attribute names are those of the Field Mapping
   (HoleStatus, TechnoWellKey, PlanFromD1, PlanCoredComment1, HoleAbandonComment…). */
SELECT 'HOLEDETAILS'    AS TableName, NAME AS Name, CAST(VALUE AS NVARCHAR(MAX)) AS Value FROM dbo.HOLEDETAILS    WHERE HOLEID = @HoleId
UNION ALL
SELECT 'HOLECOMMENT'    AS TableName, NAME AS Name, CAST(VALUE AS NVARCHAR(MAX)) AS Value FROM dbo.HOLECOMMENT    WHERE HOLEID = @HoleId
UNION ALL
SELECT 'HOLEBIGCOMMENT' AS TableName, NAME AS Name, CAST(VALUE AS NVARCHAR(MAX)) AS Value FROM dbo.HOLEBIGCOMMENT WHERE HOLEID = @HoleId

-- @query HoleGtn
/* Planned GTN of one hole. Returned columns: GeolFrom, GeolTo, Name, Value, Priority. */
SELECT GEOLFROM AS GeolFrom, GEOLTO AS GeolTo, NAME AS Name, CAST(VALUE AS NVARCHAR(100)) AS Value, PRIORITY AS Priority
  FROM dbo.GEODETAILS
 WHERE HOLEID = @HoleId
   AND NAME IN ('LithoPlanned', 'CACO3_Risks')
 ORDER BY GEOLFROM, GEOLTO

-- @query HoleVersion
/* Version of a hole = its last modification date, from the database object tracking
   (updated for any change, through the acQuire interface or not). Used to detect that another
   user changed the hole in the meantime (X-05). Format 126 = ISO 8601 with milliseconds. */
SELECT CONVERT(NVARCHAR(30), MAX(UPDDATE_QLOH), 126)
  FROM dbo.QLOH_OBJECTSTATUS
 WHERE HOLEID = @HoleId

-- @query HoleExists
/* 1 when the HOLEID already exists in acQuire, otherwise 0. */
SELECT CASE WHEN EXISTS (SELECT 1 FROM dbo.HOLELOCATION WHERE HOLEID = @HoleId) THEN 1 ELSE 0 END

-- @query HolesNear
/* Holes near a point (checks V-10 and V-13). Returned columns: HoleId, X, Y.
   Compared with ALL coordinate sets of the same grid, whatever the measurement method
   (UTM_Z49N_Planned, UTM_Z49N_Pegged, UTM_Z49N_Surveyed…).
   @Grid (e.g. UTM_Z49N) and @Radius are supplied by the application.
   [_] = the "_" character itself (in LIKE, "_" alone means "any character"). */
SELECT HOLEID AS HoleId, X, Y
  FROM dbo.HOLECOORD
 WHERE COORDINATESET LIKE @Grid + '[_]%'
   AND X BETWEEN @X - @Radius AND @X + @Radius
   AND Y BETWEEN @Y - @Radius AND @Y + @Radius

-- @query KeyExists
/* 1 when ANOTHER hole already uses this KEY (check V-15), otherwise 0.
   The KEY is the HOLEDETAILS attribute 'TechnoWellKey'. */
SELECT CASE WHEN EXISTS (
         SELECT 1 FROM dbo.HOLEDETAILS
          WHERE NAME = 'TechnoWellKey' AND CAST(VALUE AS NVARCHAR(50)) = @Key AND HOLEID <> @HoleId
       ) THEN 1 ELSE 0 END

-- @query MaxKey
/* Highest KEY among ALL holes, whatever their status (suggested KEY = this number + 1).
   Non-numeric values are ignored. */
SELECT MAX(TRY_CAST(CAST(VALUE AS NVARCHAR(50)) AS BIGINT))
  FROM dbo.HOLEDETAILS
 WHERE NAME = 'TechnoWellKey'


/* =============================================================================
   PART 2 – WRITES = THE LOAD PATH TO ACQUIRE
   -----------------------------------------------------------------------------
   These queries are ACTIVE: "Send to acQuire" and saves on the Edit program page
   write into the database of the "Acquire" connection string (ACQMN01_DEV for tests).
   To switch writing off again, turn them into comments: sending is then refused.

   The application runs them in ONE transaction, after a lock on the HOLEID:
   if one step fails (e.g. coordinates outside the grid, checked by the database),
   nothing is written for that hole and the database message is shown to the user.
   Order: InsertLocation (or UpdateLocation) → UpsertCoord → UpsertAttribute (once per
   attribute) → DeletePlannedGtn → InsertGtn (once per GTN attribute).

   Parameters: @HoleId, @ProjectCode, @Prospect, @TenementId, @Grid, @CoordinateSet,
   @X, @Y, @Z, @TableName, @Name, @Value, @GeolFrom, @GeolTo, @Priority.
   ============================================================================= */

-- @query InsertLocation
/* New hole. HOLETYPE is always 'DRILLHOLE'; GRIDNAME = @Grid (e.g. UTM_Z49N).
   For later: STARTDATE / ENDDATE (planned drilling dates) also exist in HOLELOCATION,
   but they are not the responsibility of this application's users for now. */
INSERT INTO dbo.HOLELOCATION (HOLEID, PROJECTCODE, PROSPECT, TENEMENTID, GRIDNAME, HOLETYPE)
VALUES (@HoleId, @ProjectCode, @Prospect, @TenementId, @Grid, 'DRILLHOLE')

-- @query UpdateLocation
/* Existing hole. The project is not changed (locked once the hole is in acQuire). */
UPDATE dbo.HOLELOCATION
   SET PROSPECT   = @Prospect,
       TENEMENTID = @TenementId,
       GRIDNAME   = @Grid
 WHERE HOLEID = @HoleId
   AND PROJECTCODE = @ProjectCode

-- @query UpsertCoord
/* Planned coordinates. PROJECTCODE is part of the foreign key to the collar.
   The database checks the grid limits itself. */
MERGE dbo.HOLECOORD AS t
USING (SELECT @HoleId AS HOLEID, @ProjectCode AS PROJECTCODE, @CoordinateSet AS COORDINATESET) AS s
   ON t.HOLEID = s.HOLEID AND t.COORDINATESET = s.COORDINATESET
 WHEN MATCHED THEN UPDATE SET X = @X, Y = @Y, Z = @Z
 WHEN NOT MATCHED THEN INSERT (HOLEID, PROJECTCODE, COORDINATESET, X, Y, Z)
                       VALUES (@HoleId, @ProjectCode, @CoordinateSet, @X, @Y, @Z);

-- @query UpsertAttribute
/* One attribute. @TableName = 'HOLEDETAILS' | 'HOLECOMMENT' | 'HOLEBIGCOMMENT'.
   @Value NULL = the attribute is deleted (field cleared, unused interval slot).
   PROJECTCODE is mandatory and part of the key (HOLEID + PROJECTCODE + NAME). */
IF @TableName = 'HOLEDETAILS'
BEGIN
    IF @Value IS NULL
        DELETE FROM dbo.HOLEDETAILS
         WHERE HOLEID = @HoleId AND PROJECTCODE = @ProjectCode AND NAME = @Name;
    ELSE
        MERGE dbo.HOLEDETAILS AS t
        USING (SELECT @HoleId AS HOLEID, @ProjectCode AS PROJECTCODE, @Name AS NAME) AS s
           ON t.HOLEID = s.HOLEID AND t.PROJECTCODE = s.PROJECTCODE AND t.NAME = s.NAME
         WHEN MATCHED THEN UPDATE SET VALUE = @Value
         WHEN NOT MATCHED THEN INSERT (HOLEID, PROJECTCODE, NAME, VALUE)
                               VALUES (@HoleId, @ProjectCode, @Name, @Value);
END
ELSE IF @TableName = 'HOLECOMMENT'
BEGIN
    IF @Value IS NULL
        DELETE FROM dbo.HOLECOMMENT
         WHERE HOLEID = @HoleId AND PROJECTCODE = @ProjectCode AND NAME = @Name;
    ELSE
        MERGE dbo.HOLECOMMENT AS t
        USING (SELECT @HoleId AS HOLEID, @ProjectCode AS PROJECTCODE, @Name AS NAME) AS s
           ON t.HOLEID = s.HOLEID AND t.PROJECTCODE = s.PROJECTCODE AND t.NAME = s.NAME
         WHEN MATCHED THEN UPDATE SET VALUE = @Value
         WHEN NOT MATCHED THEN INSERT (HOLEID, PROJECTCODE, NAME, VALUE)
                               VALUES (@HoleId, @ProjectCode, @Name, @Value);
END
ELSE IF @TableName = 'HOLEBIGCOMMENT'
BEGIN
    IF @Value IS NULL
        DELETE FROM dbo.HOLEBIGCOMMENT
         WHERE HOLEID = @HoleId AND PROJECTCODE = @ProjectCode AND NAME = @Name;
    ELSE
        MERGE dbo.HOLEBIGCOMMENT AS t
        USING (SELECT @HoleId AS HOLEID, @ProjectCode AS PROJECTCODE, @Name AS NAME) AS s
           ON t.HOLEID = s.HOLEID AND t.PROJECTCODE = s.PROJECTCODE AND t.NAME = s.NAME
         WHEN MATCHED THEN UPDATE SET VALUE = @Value
         WHEN NOT MATCHED THEN INSERT (HOLEID, PROJECTCODE, NAME, VALUE)
                               VALUES (@HoleId, @ProjectCode, @Name, @Value);
END

-- @query DeletePlannedGtn
/* Deletes the planned GTN of the hole before writing it again.
   Only the planned attributes are touched (not the drilled GTN). */
DELETE FROM dbo.GEODETAILS
 WHERE HOLEID = @HoleId
   AND PROJECTCODE = @ProjectCode
   AND NAME IN ('LithoPlanned', 'CACO3_Risks')

-- @query InsertGtn
/* One GTN attribute of one interval. @Priority = 100. */
INSERT INTO dbo.GEODETAILS (HOLEID, PROJECTCODE, GEOLFROM, GEOLTO, NAME, VALUE, PRIORITY)
VALUES (@HoleId, @ProjectCode, @GeolFrom, @GeolTo, @Name, @Value, @Priority)
