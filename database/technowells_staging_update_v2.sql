/* =====================================================================
   TechnoWells – UPDATE of a staging schema already created with the
   previous version of technowells_staging.sql
   Changes:
     1. stg.STG_HOLE renamed to stg.STG_COLLAR (skipped if already done)
     2. STG_GEODETAILS: a row carries the lithology, the CaCO3 risk, or both
        (fallback for different intervals per attribute)
     3. Views recreated: they now read STG_COLLAR and the acQuire tables
        of the same database (dbo.<table> instead of ACQMN01.dbo.<table>)
   Safe to run several times. Run in a TEST environment first.
   Requires SQL Server 2016 SP1 or later (CREATE OR ALTER).
   ===================================================================== */
USE ACQMN01_DEV;
GO

/* ---------------------------------------------------------------------
   1. Rename the table (data, keys and indexes are kept)
   --------------------------------------------------------------------- */
IF OBJECT_ID(N'stg.STG_HOLE', N'U') IS NOT NULL AND OBJECT_ID(N'stg.STG_COLLAR', N'U') IS NULL
BEGIN
    EXEC sp_rename N'stg.STG_HOLE', N'STG_COLLAR';
    PRINT 'stg.STG_HOLE renamed to stg.STG_COLLAR';
END
ELSE
    PRINT 'Rename skipped (STG_COLLAR already exists or STG_HOLE not found)';
GO

-- Optional, cosmetic: constraint names that still contain STG_HOLE
DECLARE @sql NVARCHAR(MAX) = N'';
SELECT @sql += N'EXEC sp_rename N''stg.' + o.name + N''', N''' + REPLACE(o.name, N'STG_HOLE', N'STG_COLLAR') + N''', N''OBJECT'';' + CHAR(10)
  FROM sys.objects o
 WHERE o.schema_id = SCHEMA_ID(N'stg')
   AND o.type IN ('PK', 'UQ', 'C', 'D', 'F')
   AND o.name LIKE N'%STG[_]HOLE%';
IF @sql <> N'' EXEC sp_executesql @sql;
GO

/* ---------------------------------------------------------------------
   2. GTN: at least one value per row (lithology and/or CaCO3 risk)
   --------------------------------------------------------------------- */
-- Rows with neither value would block the new rule: they are listed here first.
SELECT stg_geo_id, holeid, geol_from, geol_to
  FROM stg.STG_GEODETAILS
 WHERE litho_planned IS NULL AND caco3_risks IS NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = N'CK_STG_GEO_one_value')
   AND NOT EXISTS (SELECT 1 FROM stg.STG_GEODETAILS WHERE litho_planned IS NULL AND caco3_risks IS NULL)
BEGIN
    ALTER TABLE stg.STG_GEODETAILS WITH CHECK
      ADD CONSTRAINT CK_STG_GEO_one_value CHECK (litho_planned IS NOT NULL OR caco3_risks IS NOT NULL);
    PRINT 'Constraint CK_STG_GEO_one_value added';
END
ELSE
    PRINT 'Constraint skipped: already there, or some rows listed above have no value (fix or delete them, then run again)';
GO

/* ---------------------------------------------------------------------
   3. Views (same definitions as technowells_staging.sql)
   --------------------------------------------------------------------- */

CREATE OR ALTER VIEW stg.v_LOOKUP AS
    SELECT N'L01' AS LOOKUP_ID, PROJECTCODE AS CODE, PROJECTNAME AS DESCRIPTION, CAST(NULL AS NVARCHAR(50)) AS PARENT
      FROM dbo.PROJECT
    UNION ALL
    SELECT N'L02', PROSPECT, PROSPECT, PROJECTCODE                 -- campaign, parent = project
      FROM dbo.PROSPECT
    UNION ALL
    SELECT N'L03', TENEMENTID, DESCRIPTION, NULL
      FROM dbo.TENEMENT
    UNION ALL
    SELECT N'L04', LOOKUP, DESCRIPTION, NULL
      FROM dbo.QV_VS_LOOKUP_RO
     WHERE FIELDNAME = 'HoleStatus'
       AND LOOKUP IN ('PROJECT', 'PROGRAM_TOVALIDATE', 'PROGRAM_VALIDATED', 'FAILED')
    UNION ALL
    SELECT N'L05', COORDINATESET, DESCRIPTION, NULL                -- parent (project) rule TBD
      FROM dbo.GDCOORDINATESET
     WHERE COORDINATESET LIKE '%[_]Planned'
    UNION ALL
    SELECT N'L06', LOOKUP, DESCRIPTION, NULL
      FROM dbo.QV_VS_LOOKUP_RO WHERE FIELDNAME = 'HolePurpose'
    UNION ALL
    SELECT N'L08', LOOKUP, DESCRIPTION, NULL
      FROM dbo.QV_VS_LOOKUP_RO WHERE FIELDNAME = 'HolePlanTarget'
    UNION ALL
    SELECT N'L09', DRILLTYPE, DESCRIPTION, NULL
      FROM dbo.DRILLTYPE
    UNION ALL
    SELECT N'L13', LOOKUP, DESCRIPTION, NULL
      FROM dbo.QV_VS_LOOKUP_RO WHERE FIELDNAME = 'DrillRig'
    UNION ALL
    SELECT N'L14', LOOKUP, DESCRIPTION, NULL
      FROM dbo.QV_VS_LOOKUP_RO WHERE FIELDNAME = 'DrillCompany'
    UNION ALL
    SELECT N'L16', v.CODE, v.CODE, NULL                             -- fixed list until a source exists
      FROM (VALUES (N'Yes'), (N'No')) AS v(CODE)
    /* TODO when the sources are known:
       L07 Sub purpose (PARENT = purpose), L10 Chief geologist,
       L11 Technic geologist, L12 Drill master, L15 Lithology (planned)
       Probably: SELECT LOOKUP, DESCRIPTION FROM dbo.QV_VS_LOOKUP_RO
                 WHERE FIELDNAME = '<acQuire field name>'                     */
;
GO

CREATE OR ALTER VIEW stg.v_CHECK_HOLEID_IN_ACQUIRE AS
SELECT s.holeid
  FROM stg.STG_COLLAR s
  JOIN dbo.HOLELOCATION h ON h.HOLEID = s.holeid;
GO

CREATE OR ALTER VIEW stg.v_CHECK_LOOKUPS AS
SELECT s.holeid, N'projectcode' AS field, s.projectcode AS value, N'V-02' AS rule_id
  FROM stg.STG_COLLAR s
 WHERE s.projectcode IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM stg.v_LOOKUP l WHERE l.LOOKUP_ID = N'L01' AND l.CODE = s.projectcode)
UNION ALL
SELECT s.holeid, N'prospect', s.prospect, N'V-02'
  FROM stg.STG_COLLAR s
 WHERE s.prospect IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM stg.v_LOOKUP l WHERE l.LOOKUP_ID = N'L02' AND l.CODE = s.prospect AND l.PARENT = s.projectcode)
UNION ALL
SELECT s.holeid, N'coordinateset', s.coordinateset, N'V-02'
  FROM stg.STG_COLLAR s
 WHERE s.coordinateset IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM stg.v_LOOKUP l WHERE l.LOOKUP_ID = N'L05' AND l.CODE = s.coordinateset)
UNION ALL
SELECT s.holeid, N'plan_drill_type', s.plan_drill_type, N'V-02'
  FROM stg.STG_COLLAR s
 WHERE s.plan_drill_type IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM stg.v_LOOKUP l WHERE l.LOOKUP_ID = N'L09' AND l.CODE = s.plan_drill_type);
GO

CREATE OR ALTER VIEW stg.v_CHECK_SAME_XY AS
SELECT s.holeid, o.holeid AS other_holeid
  FROM stg.STG_COLLAR s
  JOIN (
        SELECT holeid, x, y, coordinateset FROM stg.STG_COLLAR
        UNION ALL
        SELECT c.HOLEID, c.X, c.Y, c.COORDINATESET FROM dbo.HOLECOORD c
       ) o
    ON o.x = s.x AND o.y = s.y AND o.coordinateset = s.coordinateset
   AND o.holeid <> s.holeid
   AND LEFT(o.holeid, LEN(o.holeid) - 1) <> LEFT(s.holeid, LEN(s.holeid) - 1);
GO

CREATE OR ALTER VIEW stg.v_LOAD_HOLELOCATION AS
SELECT stg_hole_id, holeid AS HOLEID, projectcode AS PROJECTCODE, prospect AS PROSPECT, tenementid AS TENEMENTID
  FROM stg.STG_COLLAR;
GO

CREATE OR ALTER VIEW stg.v_LOAD_HOLECOORD AS
SELECT stg_hole_id, holeid AS HOLEID, coordinateset AS COORDINATESET, x AS X, y AS Y, z AS Z
  FROM stg.STG_COLLAR;
GO

CREATE OR ALTER VIEW stg.v_LOAD_HOLEDETAILS AS
SELECT s.stg_hole_id, s.holeid AS HOLEID, a.NAME, a.VALUE
  FROM stg.STG_COLLAR s
 CROSS APPLY (VALUES
    (N'BisNumber',         s.bis_number),
    (N'HoleStatus',        N'PROJECT'),            -- always PROJECT at first import
    (N'DepthBin',          s.depth_bin),
    (N'TechnoWellKey',     s.technowell_key),
    (N'HolePrefix',        s.hole_prefix),
    (N'EastingColumnHexa', s.easting_column_hexa),
    (N'NorthingRowHexa',   s.northing_row_hexa),
    (N'HolePurpose',       s.hole_purpose),
    (N'SubPurpose',        s.sub_purpose),
    (N'HolePlanTarget',    s.hole_plan_target),
    (N'HolePlanDate',      CONVERT(NVARCHAR(10), s.hole_plan_date, 23)),
    (N'PlanDrillType',     s.plan_drill_type),
    (N'HolePlanDepth',     CAST(s.hole_plan_depth AS NVARCHAR(20))),
    (N'ChiefGeologist',    s.chief_geologist),
    (N'TechnicGeologist',  s.technic_geologist),
    (N'DrillMaster',       s.drill_master),
    (N'DrillRig',          s.drill_rig),
    (N'DrillCompany',      s.drill_company),
    (N'PlanFromD1', CAST(s.plan_from_d1 AS NVARCHAR(20))), (N'PlanToD1', CAST(s.plan_to_d1 AS NVARCHAR(20))),
    (N'PlanFromD2', CAST(s.plan_from_d2 AS NVARCHAR(20))), (N'PlanToD2', CAST(s.plan_to_d2 AS NVARCHAR(20))),
    (N'PlanFromD3', CAST(s.plan_from_d3 AS NVARCHAR(20))), (N'PlanToD3', CAST(s.plan_to_d3 AS NVARCHAR(20))),
    (N'PlanFromD4', CAST(s.plan_from_d4 AS NVARCHAR(20))), (N'PlanToD4', CAST(s.plan_to_d4 AS NVARCHAR(20))),
    (N'PlanFromC1', CAST(s.plan_from_c1 AS NVARCHAR(20))), (N'PlanToC1', CAST(s.plan_to_c1 AS NVARCHAR(20))), (N'PlanRecoveryC1', CAST(s.plan_recovery_c1 AS NVARCHAR(20))),
    (N'PlanFromC2', CAST(s.plan_from_c2 AS NVARCHAR(20))), (N'PlanToC2', CAST(s.plan_to_c2 AS NVARCHAR(20))), (N'PlanRecoveryC2', CAST(s.plan_recovery_c2 AS NVARCHAR(20))),
    (N'PlanFromC3', CAST(s.plan_from_c3 AS NVARCHAR(20))), (N'PlanToC3', CAST(s.plan_to_c3 AS NVARCHAR(20))), (N'PlanRecoveryC3', CAST(s.plan_recovery_c3 AS NVARCHAR(20))),
    (N'HoleMudPlugFrom',   CAST(s.hole_mud_plug_from AS NVARCHAR(20))),
    (N'HoleMudPlugTo',     CAST(s.hole_mud_plug_to AS NVARCHAR(20))),
    (N'ScreenTop',         CAST(s.screen_top AS NVARCHAR(20))),
    (N'ScreenBottom',      CAST(s.screen_bottom AS NVARCHAR(20)))
 ) AS a(NAME, VALUE)
 WHERE a.VALUE IS NOT NULL;
GO

CREATE OR ALTER VIEW stg.v_LOAD_HOLECOMMENT AS
SELECT s.stg_hole_id, s.holeid AS HOLEID, a.NAME, a.VALUE
  FROM stg.STG_COLLAR s
 CROSS APPLY (VALUES
    (N'HolePlanComments',   s.hole_plan_comments),
    (N'HoleAbandonComment', s.hole_abandon_comment)
 ) AS a(NAME, VALUE)
 WHERE a.VALUE IS NOT NULL;
GO

CREATE OR ALTER VIEW stg.v_LOAD_HOLEBIGCOMMENT AS
SELECT s.stg_hole_id, s.holeid AS HOLEID, a.NAME, a.VALUE
  FROM stg.STG_COLLAR s
 CROSS APPLY (VALUES
    (N'PlanStartComment',  s.plan_start_comment),
    (N'PlanStopComment',   s.plan_stop_comment),
    (N'PlanCoredComment1', s.plan_cored_comment1),
    (N'PlanCoredComment2', s.plan_cored_comment2),
    (N'PlanCoredComment3', s.plan_cored_comment3)
 ) AS a(NAME, VALUE)
 WHERE a.VALUE IS NOT NULL;
GO

CREATE OR ALTER VIEW stg.v_LOAD_GEODETAILS AS
SELECT g.stg_hole_id, g.holeid AS HOLEID, g.geol_from AS GEOLFROM, g.geol_to AS GEOLTO,
       a.NAME, a.VALUE, g.priority AS PRIORITY
  FROM stg.STG_GEODETAILS g
 CROSS APPLY (VALUES
    (N'LithoPlanned', g.litho_planned),
    (N'CACO3_Risks',  g.caco3_risks)
 ) AS a(NAME, VALUE)
 WHERE a.VALUE IS NOT NULL;
GO

/* ---------------------------------------------------------------------
   4. Check
   --------------------------------------------------------------------- */
SELECT name, type_desc FROM sys.objects WHERE schema_id = SCHEMA_ID(N'stg') AND type IN ('U', 'V') ORDER BY type_desc, name;
SELECT LOOKUP_ID, COUNT(*) AS values_count FROM stg.v_LOOKUP GROUP BY LOOKUP_ID ORDER BY LOOKUP_ID;
GO
