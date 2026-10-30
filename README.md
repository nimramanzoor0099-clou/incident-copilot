# Incident Copilot

An AI-assisted production incident triage frontend. Paste an error or log and get:

- **What happened**: a plain-language summary with the evidence found in your log
- **Possible causes**: ranked by likelihood, each with a way to check it
- **How to fix it**: ordered steps with copyable commands
- **How to prevent it**: changes that stop a repeat

Built with React 18 and Vite. No UI library, no runtime dependencies beyond React.

## Screens

| Route | Screen | What it does |
| --- | --- | --- |
| `#/` | Overview | Open incidents, severity breakdown, service health, recent events, 14-day trend |
| `#/incidents` | Incidents explorer | Search, filters, sorting, pagination, inline status and assignee changes |
| `#/incidents/INC-1001` | Incident investigation | Timeline with notes, filterable logs, stack trace, AI hypotheses and remediation |
| `#/copilot` | Copilot | Paste any error for an instant diagnosis, then create an incident from it |
| `#/settings` | Workspace settings | Organization, members and roles, integrations, audit log |

Navigation uses a small hash router (`src/router.jsx`), so there are no extra dependencies and it works on any static host.

Workspace data (incidents, members, integrations, audit log) is sample data generated in `src/lib/seed.js` and held in
memory by `src/store.jsx`. Changes last until you refresh. Replace the store actions with API calls when you add a backend.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:5173. To build for production: `npm run build`.

## Sample engine vs. real AI

By default the app uses a built-in sample engine (`src/lib/knowledge.js`) that recognises common failures such as
connection refused, out of memory, CrashLoopBackOff, full disk, database pool exhaustion, CORS, auth errors, null
references and gateway timeouts. Nothing leaves the browser.

To use a real AI model, build a backend endpoint and set it in `.env`:

```
VITE_API_URL=https://your-backend.example.com/api/analyze
```

The app will `POST` this JSON:

```json
{ "log": "...", "service": "payments-api", "environment": "Production", "stack": "Node.js" }
```

and expects a response in this shape:

```json
{
  "title": "Service refused the connection",
  "category": "Network",
  "severity": "high",            
  "confidence": 85,              
  "summary": "...",
  "evidence": ["line from the log"],
  "context": { "service": "payments-api", "environment": "Production", "stack": "Node.js" },
  "causes": [{ "title": "...", "likelihood": 65, "detail": "...", "check": "..." }],
  "fixes": [{ "title": "...", "detail": "...", "command": "optional" }],
  "prevention": ["..."]
}
```

`severity` is one of `critical`, `high`, `medium`, `low`. Keep your model API key on the server, never in this frontend.

## Backend

A Node.js + Express API lives in [`backend/`](backend/README.md) and the frontend is wired to it. Vite proxies `/api` to `http://localhost:4000`, so run both:

```bash
# terminal 1
cd backend && npm install && npm run dev
# terminal 2
npm install && npm run dev
```

Incidents, members, integrations, settings, the audit log and every Copilot analysis are loaded from and saved to the API, which stores them in a SQLite database (`backend/database/incident-copilot.db`, requires Node.js 22.13+). See `backend/README.md`. To use real AI, add `ANTHROPIC_API_KEY` (Claude) to `backend/.env` and restart the backend. If the backend is down, the app shows a retry screen, and Copilot analysis falls back to the built-in sample engine.

## Structure

```
src/
  App.jsx                  routes
  store.jsx                workspace state and actions
  router.jsx               hash router
  pages/                   Dashboard, IncidentsPage, IncidentPage, CopilotPage, SettingsPage
  styles.css               design tokens and styles
  lib/analyze.js           analysis entry point (sample engine or API)
  lib/knowledge.js         built-in failure patterns
  lib/samples.js           sample errors for Copilot
  lib/seed.js              sample workspace data
  lib/report.js            markdown export, time helper
  components/              Shell, charts, IncidentForm, AnalysisLoader, AnalysisReport, History, EmptyState
```


## Authentication and workspace security

- Create an account from the sign-up screen. Each new account receives its own organization/workspace and Owner role.
- Sign in with email and password. Passwords are stored as salted scrypt hashes; the API issues short-lived HS256 JWTs.
- The frontend keeps the access token in `sessionStorage` and sends it as a Bearer token. Sign out clears the browser session.
- All workspace API routes require authentication. The backend derives the active organization from the verified token using request-scoped context; clients cannot choose an `org_id`.
- Incidents, analyses, services, members, integrations, organization settings, and audit records are queried within the authenticated workspace.
- Owner/Admin can manage members, integrations, and workspace settings. Owner/Admin/Responder can create or modify incidents and run analyses. Viewer access is read-only.
- Configure `JWT_SECRET` to a long random value in production. Never expose it or `ANTHROPIC_API_KEY` in frontend environment variables.

### Database backups

Run `cd backend && npm run db:backup` to create a consistent SQLite backup using `VACUUM INTO`. Configure your host's scheduled job/cron to run this daily and copy backups to private durable object storage. Keep multiple dated copies and periodically test restoring one. Do not store backups in a public web directory.

### Existing demo database

The legacy seeded demo workspace (organization 1) is retained for local development. The first sign-up claims the starter workspace; later sign-ups create isolated workspaces and cannot access other organizations' data.
