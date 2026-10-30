-- Incident Copilot schema (SQLite, STRICT tables).
-- Timestamps are Unix epoch milliseconds (INTEGER). Booleans are 0/1.
-- Every business table carries org_id so the schema is ready for multiple workspaces.

-- ---------------------------------------------------------------- workspace
CREATE TABLE organizations (
  id                INTEGER PRIMARY KEY,
  name              TEXT    NOT NULL CHECK (length(name) BETWEEN 1 AND 100),
  slug              TEXT    NOT NULL UNIQUE CHECK (length(slug) BETWEEN 1 AND 50 AND slug NOT GLOB '*[^a-z0-9-]*'),
  timezone          TEXT    NOT NULL DEFAULT 'UTC',
  retention_days    INTEGER NOT NULL DEFAULT 90 CHECK (retention_days IN (30, 90, 180, 365)),
  default_severity  TEXT    NOT NULL DEFAULT 'medium' CHECK (default_severity IN ('critical','high','medium','low')),
  auto_page         INTEGER NOT NULL DEFAULT 1 CHECK (auto_page   IN (0, 1)),
  digest            INTEGER NOT NULL DEFAULT 1 CHECK (digest      IN (0, 1)),
  require_mfa       INTEGER NOT NULL DEFAULT 0 CHECK (require_mfa IN (0, 1)),
  created_at        INTEGER NOT NULL,
  updated_at        INTEGER NOT NULL
) STRICT;

CREATE TABLE members (
  id          INTEGER PRIMARY KEY,                       -- exposed by the API as "u<id>"
  org_id      INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name        TEXT    NOT NULL CHECK (length(name) > 0),
  email       TEXT    NOT NULL COLLATE NOCASE CHECK (email LIKE '%_@_%._%'),
  role        TEXT    NOT NULL CHECK (role IN ('Owner','Admin','Responder','Viewer')),
  status      TEXT    NOT NULL DEFAULT 'active' CHECK (status IN ('active','invited')),
  created_at  INTEGER NOT NULL,
  UNIQUE (org_id, email)
) STRICT;
CREATE UNIQUE INDEX uq_members_one_owner ON members(org_id) WHERE role = 'Owner';

CREATE TABLE services (
  id          INTEGER PRIMARY KEY,
  org_id      INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name        TEXT    NOT NULL CHECK (length(name) BETWEEN 1 AND 100),
  created_at  INTEGER NOT NULL,
  UNIQUE (org_id, name)
) STRICT;

CREATE TABLE integrations (
  org_id      INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  slug        TEXT    NOT NULL,                          -- slack, pagerduty, ...
  name        TEXT    NOT NULL,
  description TEXT    NOT NULL DEFAULT '',
  color       TEXT    NOT NULL DEFAULT '#444444',
  connected   INTEGER NOT NULL DEFAULT 0 CHECK (connected IN (0, 1)),
  updated_at  INTEGER NOT NULL,
  PRIMARY KEY (org_id, slug)
) STRICT;

CREATE TABLE audit_log (
  id           INTEGER PRIMARY KEY,
  org_id       INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  occurred_at  INTEGER NOT NULL,
  actor        TEXT    NOT NULL,
  action       TEXT    NOT NULL,
  target       TEXT    NOT NULL
) STRICT;
CREATE INDEX ix_audit_org_time ON audit_log(org_id, occurred_at DESC);

-- ---------------------------------------------------------------- incidents
CREATE TABLE incidents (
  id           INTEGER PRIMARY KEY,                      -- exposed by the API as "INC-<id>"
  org_id       INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title        TEXT    NOT NULL CHECK (length(title) BETWEEN 1 AND 200),
  service_id   INTEGER NOT NULL REFERENCES services(id),
  severity     TEXT    NOT NULL CHECK (severity IN ('critical','high','medium','low')),
  status       TEXT    NOT NULL DEFAULT 'open' CHECK (status IN ('open','investigating','mitigated','resolved')),
  environment  TEXT    NOT NULL DEFAULT 'Production' CHECK (environment IN ('Production','Staging','Development')),
  assignee_id  INTEGER REFERENCES members(id) ON DELETE SET NULL,
  log_text     TEXT    NOT NULL,
  created_at   INTEGER NOT NULL,
  updated_at   INTEGER NOT NULL,
  resolved_at  INTEGER,
  CHECK ((status = 'resolved') = (resolved_at IS NOT NULL))
) STRICT;
CREATE INDEX ix_incidents_org_status   ON incidents(org_id, status);
CREATE INDEX ix_incidents_org_severity ON incidents(org_id, severity);
CREATE INDEX ix_incidents_org_created  ON incidents(org_id, created_at DESC);
CREATE INDEX ix_incidents_service      ON incidents(service_id);
CREATE INDEX ix_incidents_assignee     ON incidents(assignee_id);

CREATE TABLE incident_logs (
  id           INTEGER PRIMARY KEY,
  incident_id  INTEGER NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  logged_at    INTEGER NOT NULL,
  level        TEXT    NOT NULL CHECK (level IN ('INFO','WARN','ERROR')),
  message      TEXT    NOT NULL
) STRICT;
CREATE INDEX ix_incident_logs ON incident_logs(incident_id, logged_at, id);

CREATE TABLE incident_stack_traces (
  incident_id    INTEGER PRIMARY KEY REFERENCES incidents(id) ON DELETE CASCADE,
  error_message  TEXT NOT NULL
) STRICT;

CREATE TABLE incident_stack_frames (
  id             INTEGER PRIMARY KEY,
  incident_id    INTEGER NOT NULL REFERENCES incident_stack_traces(incident_id) ON DELETE CASCADE,
  position       INTEGER NOT NULL,
  function_name  TEXT    NOT NULL,
  file           TEXT    NOT NULL,
  line           INTEGER NOT NULL,
  col            INTEGER NOT NULL,
  is_app_code    INTEGER NOT NULL DEFAULT 0 CHECK (is_app_code IN (0, 1)),
  UNIQUE (incident_id, position)
) STRICT;

CREATE TABLE incident_events (                             -- the incident timeline
  id           INTEGER PRIMARY KEY,
  incident_id  INTEGER NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  occurred_at  INTEGER NOT NULL,
  text         TEXT    NOT NULL,
  actor        TEXT    NOT NULL,
  kind         TEXT    NOT NULL CHECK (kind IN ('alert','page','assign','status','note'))
) STRICT;
CREATE INDEX ix_incident_events ON incident_events(incident_id, occurred_at, id);

-- ---------------------------------------------------------------- copilot analyses
CREATE TABLE analyses (
  id           TEXT    PRIMARY KEY,                      -- report id, e.g. inc-mh3k2x
  org_id       INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  incident_id  INTEGER REFERENCES incidents(id) ON DELETE SET NULL,
  created_at   INTEGER NOT NULL,
  engine       TEXT    NOT NULL CHECK (engine IN ('rules','ai')),
  title        TEXT    NOT NULL,
  category     TEXT    NOT NULL,
  severity     TEXT    NOT NULL CHECK (severity IN ('critical','high','medium','low')),
  confidence   INTEGER NOT NULL CHECK (confidence BETWEEN 0 AND 100),
  summary      TEXT    NOT NULL,
  service      TEXT    NOT NULL,
  environment  TEXT    NOT NULL,
  stack        TEXT    NOT NULL,
  log_text     TEXT    NOT NULL
) STRICT;
CREATE INDEX ix_analyses_org_time ON analyses(org_id, created_at DESC);
CREATE INDEX ix_analyses_incident ON analyses(incident_id);

CREATE TABLE analysis_evidence (
  analysis_id TEXT    NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
  position    INTEGER NOT NULL,
  text        TEXT    NOT NULL,
  PRIMARY KEY (analysis_id, position)
) STRICT;

CREATE TABLE analysis_causes (
  analysis_id TEXT    NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
  position    INTEGER NOT NULL,
  title       TEXT    NOT NULL,
  likelihood  INTEGER NOT NULL CHECK (likelihood BETWEEN 0 AND 100),
  detail      TEXT    NOT NULL,
  check_text  TEXT    NOT NULL,
  PRIMARY KEY (analysis_id, position)
) STRICT;

CREATE TABLE analysis_fixes (
  analysis_id TEXT    NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
  position    INTEGER NOT NULL,
  title       TEXT    NOT NULL,
  detail      TEXT    NOT NULL,
  command     TEXT,
  PRIMARY KEY (analysis_id, position)
) STRICT;

CREATE TABLE analysis_prevention (
  analysis_id TEXT    NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
  position    INTEGER NOT NULL,
  text        TEXT    NOT NULL,
  PRIMARY KEY (analysis_id, position)
) STRICT;

-- ---------------------------------------------------------------- convenience view for DB browsers
CREATE VIEW v_incident_overview AS
SELECT 'INC-' || i.id AS incident, i.title, s.name AS service, i.severity, i.status, i.environment,
       m.name AS assignee,
       datetime(i.created_at / 1000, 'unixepoch')  AS created_utc,
       datetime(i.resolved_at / 1000, 'unixepoch') AS resolved_utc
FROM incidents i
JOIN services s     ON s.id = i.service_id
LEFT JOIN members m ON m.id = i.assignee_id;
