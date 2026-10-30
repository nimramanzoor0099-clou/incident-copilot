# Incident Copilot API

Node.js + Express backend for the Incident Copilot frontend, storing everything in a **SQLite** database.
The database file is created automatically on first start at `backend/database/incident-copilot.db`.

Requires **Node.js 22.13 or newer** (it uses the built-in `node:sqlite` module, so there is no native package to compile).

## Run

```bash
cd backend
npm install
cp .env.example .env      # optional
npm run dev               # http://localhost:4000
```

On the first start the database is created and migrations are applied. The sign-up screen creates a separate workspace for each new account. The legacy demo seed is retained only when `SEED_DEMO_DATA=true`.

## Real AI (Claude)

Analysis uses the Claude API when a key is set; otherwise the built-in rule engine answers.

1. Create a key at https://console.anthropic.com (Settings, API keys).
2. Put it in `backend/.env`: `ANTHROPIC_API_KEY=sk-ant-...`
3. Restart the backend (`.env` is only read at startup).

- Model: `ANTHROPIC_MODEL` (default `claude-sonnet-5-5`). Use `claude-haiku-5-5` for faster, cheaper answers or `claude-opus-5-5` for the most capable. To see what your key can use: `GET /api/ai/providers/claude/models`.
- Check the key and model: `POST /api/ai/providers/claude/test` returns `{ "ok": true }` when everything works.
- The Copilot page has an **AI engine** menu: *Auto* (Claude when a key exists), *Claude*, or *Built-in engine (no AI)*.
- If Claude fails (wrong key, wrong model name, no credit, timeout, unusable reply), the built-in engine answers instead and the report shows a notice explaining why. Choosing Claude without a key returns a clear 400 error.
- Each saved analysis records the provider and model that produced it.
- The key stays on the server, is sent in a request header only, and is removed from error messages.
- **Privacy:** the pasted log text (which can contain hostnames, user ids or secrets) is sent to Anthropic. Use the built-in engine for logs you must not share. Usage is billed to your Anthropic account.

## Database commands

| Command | What it does |
| --- | --- |
| `npm run db:status` | Shows applied migrations and the row count of every table |
| `npm run db:backup -- my-backup.db` | Writes a consistent copy of the database (refuses to overwrite) |
| `npm run db:reset` | Deletes the database and rebuilds it (demo data again if `SEED_DEMO_DATA=true`) |

Stop the server before `db:reset`. You can open the `.db` file with any SQLite viewer (for example DB Browser for SQLite).
The view `v_incident_overview` gives a readable one-row-per-incident summary.

## What is stored

| Table | Contents |
| --- | --- |
| `organizations` | Workspace name, slug, timezone, retention, default severity, notification and MFA switches |
| `members` | Team members, role (Owner/Admin/Responder/Viewer), active or invited status |
| `services` | Service names (created automatically when an incident uses a new one) |
| `integrations` | Slack, PagerDuty, Datadog, Sentry, GitHub, Jira and whether each is connected |
| `audit_log` | Who did what and when |
| `incidents` | Title, service, severity, status, environment, assignee, raw log, created/updated/resolved times |
| `incident_logs` | Parsed log lines with level (INFO/WARN/ERROR) and time |
| `incident_stack_traces` / `incident_stack_frames` | The error message and each frame (function, file, line, column, app code or library) |
| `incident_events` | Timeline: alerts, pages, assignments, status changes, notes |
| `analyses` | Every Copilot report that was run, with engine, provider and model, severity, confidence, summary, service, environment, stack and the log |
| `analysis_evidence`, `analysis_causes`, `analysis_fixes`, `analysis_prevention` | The ordered lists inside each report |
| `schema_migrations` | Which migration files have been applied |

Rules enforced by the database itself: allowed severities, statuses, roles and environments; a resolved incident must have a resolved time;
one Owner per workspace; unique member emails (case-insensitive); valid slugs; foreign keys with cascading deletes
(deleting an incident removes its logs, stack, timeline). Removing a member leaves their incidents unassigned.
Workspace-owned tables carry `org_id`; all repository reads and writes use the authenticated request's organization scope.

Schema changes go in new files such as `src/db/migrations/004_add_something.sql`; they run automatically once, in order.

## Settings (.env)

| Variable | Default | Purpose |
| --- | --- | --- |
| `DB_PATH` | `database/incident-copilot.db` | Database file (`:memory:` for a throwaway database) |
| `SEED_DEMO_DATA` | `true` | Fill an empty database with the demo workspace |
| `ORG_NAME`, `OWNER_NAME`, `OWNER_EMAIL` | placeholders | Used when `SEED_DEMO_DATA=false` to create the first owner |
| `ANTHROPIC_API_KEY` | empty | Turn on Claude (see above) |
| `ANTHROPIC_MODEL` | `claude-sonnet-5-5` | Which Claude model to use |
| `JWT_SECRET` | development-only fallback | HS256 signing secret; set a long random value in production |
| `JWT_TTL_SECONDS` | `86400` | Access-token lifetime in seconds |
| `DB_BACKUP_DIR` | `database/backups` | Private folder for automatic SQLite snapshots |
| `DB_BACKUP_INTERVAL_HOURS` | `24` | Automatic backup interval |
| `DB_BACKUP_RETENTION_DAYS` | `7` | Retain automatic backups for this many days |
| `CORS_ORIGIN`, `PORT`, `ANALYZE_RATE_LIMIT` | see `.env.example` | Server settings |
| `CORS_ORIGIN`, `PORT`, `ANALYZE_RATE_LIMIT` | see `.env.example` | Server settings |

Saved analyses older than the workspace retention setting are removed each time the server starts.

## Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/health` | Liveness, active engine and database status |
| POST | `/api/auth/register` | Create an account and a private workspace |
| POST | `/api/auth/login` | Sign in and receive a JWT |
| GET | `/api/auth/me` | Return the currently authenticated account |
| GET | `/api/state` | Full authenticated workspace snapshot used by the frontend |
| POST | `/api/analyze` | Body `{ log, service?, environment?, stack?, provider? }` (`auto`, `claude`, `rules`); returns and saves a report |
| GET | `/api/ai/providers` | Whether Claude has a key, the model in use, and the default |
| POST | `/api/ai/providers/claude/test` | Check the key and model with a tiny request |
| GET | `/api/ai/providers/claude/models` | Model names your key can use |
| GET | `/api/analyses`, `/api/analyses/:id` | Saved Copilot reports |
| DELETE | `/api/analyses/:id` | Delete a saved report |
| GET | `/api/incidents` | Query: `q, status, severity, service, assignee (id or none), sort (newest/oldest/severity), page, limit` |
| POST | `/api/incidents` | Body `{ title, service, log, severity?, env?, analysisId? }` |
| GET | `/api/incidents/:id` | Full record with logs, stack and timeline |
| PATCH | `/api/incidents/:id` | Body with any of `status, assigneeId, severity` |
| POST | `/api/incidents/:id/notes` | Body `{ text }` |
| POST | `/api/incidents/:id/analyze` | Run and save the copilot on the incident's own log (optional `provider`) |
| GET / POST | `/api/members` | List, or invite `{ email, role? }` |
| PATCH / DELETE | `/api/members/:id` | Change role, or remove (Owner is protected) |
| GET | `/api/integrations` | List integrations |
| POST | `/api/integrations/:id/toggle` | Connect or disconnect |
| GET / PUT | `/api/org` | Organization settings |
| GET | `/api/audit?limit=` | Audit log |
| GET | `/api/meta` | Services, severities, statuses, roles |
| GET | `/api/dashboard` | Totals, severity breakdown, service health, 14-day trend, MTTR, recent events |

Errors return `{ "error": "message" }` with a suitable status code (400, 401, 404, 429, 500).

## Structure

```
database/            SQLite file lives here (created at runtime, ignored by git)
src/
  server.js          entry point (opens the database, then starts Express)
  app.js             middleware and route wiring
  config/            environment config
  routes/            analyze, analyses, ai, incidents, members, workspace
  services/          ruleEngine, analyzer, ai/ (prompt, http, Claude provider)
  db/
    index.js         connection, transactions
    migrate.js       migration runner
    migrations/      001_init.sql (schema), 002_analysis_provider.sql
    seed.js          demo data and clean-start loaders
    cli.js           status / reset / backup
    repos/           one module per area: incidents, members, analyses, ...
  data/              demo data generator and the rule engine's knowledge base
  middleware/        auth, errors
  utils/             validation, HttpError
```


## Authentication and authorization

All `/api` endpoints except `/api/auth/register` and `/api/auth/login` require `Authorization: Bearer <JWT>`. Passwords use salted scrypt hashes. The frontend stores the short-lived token in `sessionStorage`; logout clears it. The backend re-checks the account and current role from SQLite on each request, so deleted accounts and role changes take effect immediately.

The first signup claims the existing starter/demo workspace (preserving its sample incidents) and becomes its Owner. Each later signup creates a separate organization and Owner member. Repository access uses request-scoped organization context; callers cannot submit an organization ID to select another tenant. Owner/Admin can manage members, integrations, and workspace settings. Owner/Admin/Responder can create or update incidents and run analyses. Viewer is read-only.

## Automatic backups

The server creates a SQLite snapshot on startup and then at the configured interval (24 hours by default), using `VACUUM INTO`. It removes automatic snapshots older than the configured retention period. Backups are stored under `backend/database/backups` by default and are excluded from Git. The existing manual command `npm run db:backup -- path/to/backup.db` remains available. For production, copy backups to private durable storage and periodically test restoring them.
