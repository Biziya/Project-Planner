/* =====================================================================
   TechnoWells Drillhole App – staging database and links to acQuire
   Target: SQL Server, schema stg created INSIDE the acQuire database
   (ACQMN01_DEV for tests). acQuire tables are therefore read as dbo.<table>.
   Run step by step, in a TEST environment first.

   Contents
     0. Database and schema
     1. Staging data tables      (STG_COLLAR, STG_GEODETAILS)
     2. Supporting tables        (sessions, issues, send batches, audit, templates)
     3. Lookup views on acQuire  (read-only)
     4. Check queries used by the validation engine
     5. Load views               (staging -> acQuire format, for the load path)
     6. Permissions
   ===================================================================== */


/* ---------------------------------------------------------------------
   0. DATABASE AND SCHEMA
   --------------------------------------------------------------------- */
USE ACQMN01_DEV;   -- staging lives in a separate schema (stg) of the acQuire database
GO
CREATE SCHEMA stg;
GO


/* ---------------------------------------------------------------------
   1. STAGING DATA TABLES
   One row per hole (HOLELOCATION, HOLECOORD, HOLEDETAILS, HOLECOMMENT,
   HOLEBIGCOMMENT fields) and one row per GTN interval (GEODETAILS).
   Column names = "Staging column" of section 5.2 of the specification.
   --------------------------------------------------------------------- */
CREATE TABLE stg.STG_COLLAR (
    -- technical
    stg_hole_id            UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_STG_COLLAR_id DEFAULT NEWID(),
    app_status             NVARCHAR(30)  NOT NULL CONSTRAINT DF_STG_COLLAR_status DEFAULT N'Preparation',
    source                 NVARCHAR(10)  NOT NULL CONSTRAINT CK_STG_COLLAR_source CHECK (source IN (N'form', N'excel')),
    import_session_id      INT           NULL,
    error_count            INT           NOT NULL CONSTRAINT DF_STG_COLLAR_err DEFAULT 0,
    warning_count          INT           NOT NULL CONSTRAINT DF_STG_COLLAR_warn DEFAULT 0,
    row_version            ROWVERSION,
    created_by             NVARCHAR(100) NOT NULL,
    created_at             DATETIME2(0)  NOT NULL CONSTRAINT DF_STG_COLLAR_cat DEFAULT SYSUTCDATETIME(),
    updated_by             NVARCHAR(100) NULL,
    updated_at             DATETIME2(0)  NULL,

    -- Drillhole header
    holeid                 NVARCHAR(30)  NOT NULL,     -- HOLELOCATION.HOLEID
    bis_number             NVARCHAR(2)   NULL,         -- HOLEDETAILS.BisNumber (auto)
    projectcode            NVARCHAR(30)  NULL,         -- HOLELOCATION.PROJECTCODE
    prospect               NVARCHAR(50)  NULL,         -- HOLELOCATION.PROSPECT (Campaign)
    tenementid             NVARCHAR(30)  NULL,         -- HOLELOCATION.TENEMENTID
    hole_status            NVARCHAR(30)  NULL,         -- HOLEDETAILS.HoleStatus
    hole_abandon_comment   NVARCHAR(MAX) NULL,         -- HOLECOMMENT.HoleAbandonComment
    depth_bin              NVARCHAR(10)  NULL,         -- HOLEDETAILS.DepthBin (auto)
    technowell_key         NVARCHAR(50)  NULL,         -- HOLEDETAILS.TechnoWellKey
    hole_prefix            NVARCHAR(3)   NULL,         -- HOLEDETAILS.HolePrefix (auto)
    easting_column_hexa    NVARCHAR(3)   NULL,         -- HOLEDETAILS.EastingColumnHexa (auto)
    northing_row_hexa      NVARCHAR(3)   NULL,         -- HOLEDETAILS.NorthingRowHexa (auto)

    -- Planned coordinates and direction
    x                      DECIMAL(12,3) NULL,         -- HOLECOORD.X
    y                      DECIMAL(12,3) NULL,         -- HOLECOORD.Y
    z                      DECIMAL(8,3)  NULL,         -- HOLECOORD.Z
    coordinateset          NVARCHAR(50)  NULL,         -- HOLECOORD.COORDINATESET
    azimuth                DECIMAL(5,2)  NULL,         -- not mapped in acQuire yet
    dip                    DECIMAL(5,2)  NULL,         -- not mapped in acQuire yet

    -- Picket details (HOLEDETAILS)
    hole_purpose           NVARCHAR(30)  NULL,
    sub_purpose            NVARCHAR(30)  NULL,
    hole_plan_target       NVARCHAR(30)  NULL,
    hole_plan_date         DATE          NULL,
    plan_drill_type        NVARCHAR(30)  NULL,
    hole_plan_depth        DECIMAL(7,2)  NULL,
    max_deviation          DECIMAL(7,2)  NULL,         -- field name in acQuire TBD
    chief_geologist        NVARCHAR(50)  NULL,
    technic_geologist      NVARCHAR(50)  NULL,
    drill_master           NVARCHAR(50)  NULL,
    drill_rig              NVARCHAR(50)  NULL,
    drill_company          NVARCHAR(50)  NULL,
    associated_cells       NVARCHAR(MAX) NULL,         -- not in acQuire yet

    -- Drilling construction planned: acQuire slots D1-D4 and C1-C3
    plan_from_d1 DECIMAL(7,2) NULL, plan_to_d1 DECIMAL(7,2) NULL,
    plan_from_d2 DECIMAL(7,2) NULL, plan_to_d2 DECIMAL(7,2) NULL,
    plan_from_d3 DECIMAL(7,2) NULL, plan_to_d3 DECIMAL(7,2) NULL,
    plan_from_d4 DECIMAL(7,2) NULL, plan_to_d4 DECIMAL(7,2) NULL,
    plan_from_c1 DECIMAL(7,2) NULL, plan_to_c1 DECIMAL(7,2) NULL, plan_recovery_c1 DECIMAL(5,2) NULL, plan_cored_comment1 NVARCHAR(MAX) NULL,
    plan_from_c2 DECIMAL(7,2) NULL, plan_to_c2 DECIMAL(7,2) NULL, plan_recovery_c2 DECIMAL(5,2) NULL, plan_cored_comment2 NVARCHAR(MAX) NULL,
    plan_from_c3 DECIMAL(7,2) NULL, plan_to_c3 DECIMAL(7,2) NULL, plan_recovery_c3 DECIMAL(5,2) NULL, plan_cored_comment3 NVARCHAR(MAX) NULL,
    hole_mud_plug_from     DECIMAL(7,2)  NULL,
    hole_mud_plug_to       DECIMAL(7,2)  NULL,
    screen_top             DECIMAL(7,2)  NULL,
    screen_bottom          DECIMAL(7,2)  NULL,
    hole_plan_comments     NVARCHAR(MAX) NULL,         -- HOLECOMMENT.HolePlanComments
    plan_start_comment     NVARCHAR(MAX) NULL,         -- HOLEBIGCOMMENT.PlanStartComment
    plan_stop_comment      NVARCHAR(MAX) NULL,         -- HOLEBIGCOMMENT.PlanStopComment

    CONSTRAINT PK_STG_COLLAR PRIMARY KEY (stg_hole_id),
    CONSTRAINT UQ_STG_COLLAR_holeid UNIQUE (holeid),
    -- simple checks the database can enforce itself (the app checks the rest)
    CONSTRAINT CK_STG_COLLAR_azimuth  CHECK (azimuth IS NULL OR azimuth BETWEEN 0 AND 360),
    CONSTRAINT CK_STG_COLLAR_dip      CHECK (dip IS NULL OR dip BETWEEN -90 AND 0),
    CONSTRAINT CK_STG_COLLAR_depth    CHECK (hole_plan_depth IS NULL OR hole_plan_depth > 0),
    CONSTRAINT CK_STG_COLLAR_recovery CHECK (
        (plan_recovery_c1 IS NULL OR plan_recovery_c1 BETWEEN 0 AND 100) AND
        (plan_recovery_c2 IS NULL OR plan_recovery_c2 BETWEEN 0 AND 100) AND
        (plan_recovery_c3 IS NULL OR plan_recovery_c3 BETWEEN 0 AND 100))
);
GO

CREATE TABLE stg.STG_GEODETAILS (
    stg_geo_id      INT IDENTITY(1,1) NOT NULL,
    stg_hole_id     UNIQUEIDENTIFIER NULL,   -- hole in staging ...
    holeid          NVARCHAR(30)  NOT NULL,  -- ... or a hole already in acQuire
    geol_from       DECIMAL(7,2)  NOT NULL,  -- GEODETAILS.GEOLFROM
    geol_to         DECIMAL(7,2)  NOT NULL,  -- GEODETAILS.GEOLTO
    litho_planned   NVARCHAR(30)  NULL,      -- GEODETAILS attribute LithoPlanned
    caco3_risks     NVARCHAR(3)   NULL,      -- GEODETAILS attribute CACO3_Risks (Yes/No)
    priority        INT           NOT NULL CONSTRAINT DF_STG_GEO_priority DEFAULT 100,
    row_version     ROWVERSION,
    created_by      NVARCHAR(100) NOT NULL,
    created_at      DATETIME2(0)  NOT NULL CONSTRAINT DF_STG_GEO_cat DEFAULT SYSUTCDATETIME(),
    updated_by      NVARCHAR(100) NULL,
    updated_at      DATETIME2(0)  NULL,
    CONSTRAINT PK_STG_GEODETAILS PRIMARY KEY (stg_geo_id),
    CONSTRAINT UQ_STG_GEODETAILS UNIQUE (holeid, geol_from, geol_to),
    CONSTRAINT FK_STG_GEO_HOLE FOREIGN KEY (stg_hole_id) REFERENCES stg.STG_COLLAR (stg_hole_id) ON DELETE CASCADE,
    CONSTRAINT CK_STG_GEO_interval CHECK (geol_from >= 0 AND geol_from < geol_to),
    CONSTRAINT CK_STG_GEO_caco3 CHECK (caco3_risks IS NULL OR caco3_risks IN (N'Yes', N'No')),
    -- a row carries the lithology, the CaCO3 risk, or both: the two attributes may have different intervals
    CONSTRAINT CK_STG_GEO_one_value CHECK (litho_planned IS NOT NULL OR caco3_risks IS NOT NULL)
);
GO

/* Fallback if more GEODETAILS attributes are needed later, or if the wide table above becomes awkward:
   one row per (hole, interval, attribute), i.e. exactly the GEODETAILS key. The app would then read and write
   this table instead of STG_GEODETAILS (only SqlStagingRepository changes; the load view becomes a plain SELECT).

CREATE TABLE stg.STG_GEODETAILS_ATTR (
    stg_geo_attr_id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    stg_hole_id     UNIQUEIDENTIFIER NULL REFERENCES stg.STG_COLLAR (stg_hole_id) ON DELETE CASCADE,
    holeid          NVARCHAR(30)  NOT NULL,
    geol_from       DECIMAL(7,2)  NOT NULL,
    geol_to         DECIMAL(7,2)  NOT NULL,
    attribute_name  NVARCHAR(50)  NOT NULL,    -- LithoPlanned, CACO3_Risks, ...
    value           NVARCHAR(100) NULL,
    priority        INT           NOT NULL DEFAULT 100,
    CONSTRAINT UQ_STG_GEO_ATTR UNIQUE (holeid, geol_from, geol_to, attribute_name),
    CONSTRAINT CK_STG_GEO_ATTR_interval CHECK (geol_from >= 0 AND geol_from < geol_to)
);
*/


/* ---------------------------------------------------------------------
   2. SUPPORTING TABLES
   --------------------------------------------------------------------- */
CREATE TABLE stg.IMPORT_SESSION (
    id               INT IDENTITY(1,1) PRIMARY KEY,
    kind             NVARCHAR(10)  NOT NULL CHECK (kind IN (N'holes', N'gtn')),
    file_name        NVARCHAR(260) NOT NULL,
    template_version NVARCHAR(20)  NULL,
    rows_read        INT NOT NULL DEFAULT 0,
    rows_ok          INT NOT NULL DEFAULT 0,
    rows_error       INT NOT NULL DEFAULT 0,
    created_by       NVARCHAR(100) NOT NULL,
    created_at       DATETIME2(0)  NOT NULL DEFAULT SYSUTCDATETIME()
);

CREATE TABLE stg.IMPORT_ISSUE (
    id          INT IDENTITY(1,1) PRIMARY KEY,
    session_id  INT NULL REFERENCES stg.IMPORT_SESSION (id),
    holeid      NVARCHAR(30)  NULL,
    row_number  INT           NULL,
    field       NVARCHAR(50)  NULL,
    rule_id     NVARCHAR(10)  NOT NULL,          -- V-01 ... V-17, D-05
    level       NVARCHAR(10)  NOT NULL CHECK (level IN (N'error', N'warning')),
    message     NVARCHAR(500) NOT NULL
);

CREATE TABLE stg.SEND_BATCH (
    id          INT IDENTITY(1,1) PRIMARY KEY,
    created_by  NVARCHAR(100) NOT NULL,
    created_at  DATETIME2(0)  NOT NULL DEFAULT SYSUTCDATETIME(),
    result      NVARCHAR(MAX) NULL                -- JSON: one entry per hole
);

CREATE TABLE stg.AUDIT_LOG (
    id          BIGINT IDENTITY(1,1) PRIMARY KEY,
    entity      NVARCHAR(30)  NOT NULL,          -- STG_COLLAR, STG_GEODETAILS, ACQUIRE
    entity_id   NVARCHAR(50)  NULL,
    holeid      NVARCHAR(30)  NULL,
    action      NVARCHAR(30)  NOT NULL,          -- create, update, delete, send, validate, rollback, fail
    field       NVARCHAR(50)  NULL,
    old_value   NVARCHAR(MAX) NULL,
    new_value   NVARCHAR(MAX) NULL,
    user_name   NVARCHAR(100) NOT NULL,
    at          DATETIME2(0)  NOT NULL DEFAULT SYSUTCDATETIME()
);

CREATE TABLE stg.TEMPLATE_VERSION (
    version             NVARCHAR(20) PRIMARY KEY,
    columns_json        NVARCHAR(MAX) NOT NULL,
    lookups_snapshot_at DATETIME2(0)  NOT NULL,
    created_at          DATETIME2(0)  NOT NULL DEFAULT SYSUTCDATETIME()
);
GO


/* ---------------------------------------------------------------------
   3. LOOKUP VIEWS ON acQuire (read-only)
   Same SQL Server instance, so the views read ACQMN01 directly.
   Queries come from today's Excel template. One view per lookup and
   one union view the app reads: LOOKUP_ID, CODE, DESCRIPTION, PARENT.
   --------------------------------------------------------------------- */
CREATE VIEW stg.v_LOOKUP AS
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


/* ---------------------------------------------------------------------
   4. CHECK QUERIES (used by the validation engine)
   --------------------------------------------------------------------- */

-- V-03: HOLEIDs of the staging table that already exist in acQuire
CREATE VIEW stg.v_CHECK_HOLEID_IN_ACQUIRE AS
SELECT s.holeid
  FROM stg.STG_COLLAR s
  JOIN dbo.HOLELOCATION h ON h.HOLEID = s.holeid;
GO

-- V-02: coded values not found in their lookup (example for 4 fields;
-- add one block per lookup field)
CREATE VIEW stg.v_CHECK_LOOKUPS AS
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

-- V-13: same X, Y as another hole (staging or acQuire), except re-drillings.
-- The HOLEID "root" is the HOLEID without its bis number (last character).
CREATE VIEW stg.v_CHECK_SAME_XY AS
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


/* ---------------------------------------------------------------------
   5. LOAD VIEWS (staging -> acQuire format)
   These views give the data in the shape of the acQuire tables:
   columns for HOLELOCATION / HOLECOORD, NAME-VALUE rows for the
   attribute tables. They feed the agreed load path (acQuire importer,
   acQuire API or acQuire staging table). Do NOT insert into ACQMN01
   tables directly: confirm the load path with the acQuire administrator.
   Parameter: only holes selected for a send (filter on stg_hole_id).
   --------------------------------------------------------------------- */
CREATE VIEW stg.v_LOAD_HOLELOCATION AS
SELECT stg_hole_id, holeid AS HOLEID, projectcode AS PROJECTCODE, prospect AS PROSPECT, tenementid AS TENEMENTID
  FROM stg.STG_COLLAR;
GO

CREATE VIEW stg.v_LOAD_HOLECOORD AS
SELECT stg_hole_id, holeid AS HOLEID, coordinateset AS COORDINATESET, x AS X, y AS Y, z AS Z
  FROM stg.STG_COLLAR;
GO

-- HOLEDETAILS attributes: one row per (hole, attribute) with a value
CREATE VIEW stg.v_LOAD_HOLEDETAILS AS
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

CREATE VIEW stg.v_LOAD_HOLECOMMENT AS
SELECT s.stg_hole_id, s.holeid AS HOLEID, a.NAME, a.VALUE
  FROM stg.STG_COLLAR s
 CROSS APPLY (VALUES
    (N'HolePlanComments',   s.hole_plan_comments),
    (N'HoleAbandonComment', s.hole_abandon_comment)
 ) AS a(NAME, VALUE)
 WHERE a.VALUE IS NOT NULL;
GO

CREATE VIEW stg.v_LOAD_HOLEBIGCOMMENT AS
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

-- GEODETAILS: one row per (hole, interval, attribute), PRIORITY = 100
CREATE VIEW stg.v_LOAD_GEODETAILS AS
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
   6. PERMISSIONS
   One login for the app server (service account), never personal logins.
   --------------------------------------------------------------------- */
-- Staging schema: read / write
-- CREATE USER [DOMAIN\svc_technowells] FOR LOGIN [DOMAIN\svc_technowells];
-- GRANT SELECT, INSERT, UPDATE, DELETE, EXECUTE ON SCHEMA::stg TO [DOMAIN\svc_technowells];

-- acQuire tables (same database): read only on the tables and views used above
-- GRANT SELECT ON dbo.PROJECT, dbo.PROSPECT, dbo.TENEMENT, dbo.QV_VS_LOOKUP_RO,
--                 dbo.GDCOORDINATESET, dbo.DRILLTYPE, dbo.HOLELOCATION, dbo.HOLECOORD
--              TO [DOMAIN\svc_technowells];
-- Writes to acQuire: only through the load path agreed with the acQuire administrator.
