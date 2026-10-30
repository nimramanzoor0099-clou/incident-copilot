// Sample workspace data. Replace with API calls when you add a backend.
export const SERVICES = ['payments-api', 'checkout-gateway', 'auth-service', 'billing-web', 'report-worker', 'search-api', 'notification-hub', 'inventory-db']
export const SEVERITIES = ['critical', 'high', 'medium', 'low']
export const STATUSES = ['open', 'investigating', 'mitigated', 'resolved']
export const STATUS_LABEL = { open: 'Open', investigating: 'Investigating', mitigated: 'Mitigated', resolved: 'Resolved' }
export const ROLES = ['Owner', 'Admin', 'Responder', 'Viewer']
export const ROLE_INFO = {
  Owner: 'Full access, billing and workspace deletion',
  Admin: 'Manage members, integrations and settings',
  Responder: 'Investigate and update incidents',
  Viewer: 'Read-only access',
}
const H = 3600e3
const M = 60e3

const rng = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

const TEMPLATES = [
  { sev: 'critical', svc: ['payments-api', 'billing-web', 'inventory-db'], titles: ['Database connection refused on primary', 'Primary database unreachable from API'],
    err: 'Error: connect ECONNREFUSED 10.0.4.17:5432',
    logs: [['INFO', 'Health check passed for postgres-primary'], ['WARN', 'Connection pool latency above 800ms'], ['ERROR', 'Error: connect ECONNREFUSED 10.0.4.17:5432'], ['ERROR', 'GET /v1/charges 500 - upstream database unavailable'], ['WARN', 'Retrying connection (attempt 3 of 5)'], ['ERROR', 'Pool exhausted: could not obtain connection']],
    frames: [['Pool._pulseQueue', '/app/node_modules/pg-pool/index.js', 148, 0], ['PaymentRepo.findCharge', '/app/src/payments/repo.js', 64, 1], ['chargesHandler', '/app/src/routes/charges.js', 28, 1]] },
  { sev: 'critical', svc: ['report-worker', 'search-api'], titles: ['Pods restarting with OOMKilled', 'Worker memory climbing until killed'],
    err: 'FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory',
    logs: [['INFO', 'Job export-monthly started'], ['WARN', 'Heap usage at 91% of limit'], ['ERROR', 'State: Terminated Reason: OOMKilled Exit Code: 137'], ['ERROR', 'FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory'], ['WARN', 'Back-off restarting failed container'], ['INFO', 'Pod restarted, restart count 9']],
    frames: [['Array.map', '<anonymous>', 0, 0], ['buildReportRows', '/app/src/reports/build.js', 211, 1], ['runExport', '/app/src/jobs/export.js', 57, 1]] },
  { sev: 'high', svc: ['billing-web', 'notification-hub'], titles: ['Invoice page crashes with undefined error', 'Unhandled TypeError in notification sender'],
    err: "TypeError: Cannot read properties of undefined (reading 'id')",
    logs: [['INFO', 'GET /invoices/8841 started'], ['ERROR', "TypeError: Cannot read properties of undefined (reading 'id')"], ['ERROR', 'Unhandled promise rejection - process exiting'], ['WARN', 'Error rate for /invoices above 12%'], ['INFO', 'Deploy 2026.10.27-3 finished 6 minutes earlier']],
    frames: [['getInvoice', '/app/src/billing/invoice.js', 42, 1], ['processTicksAndRejections', 'node:internal/process/task_queues', 95, 0], ['handler', '/app/src/routes/invoices.js', 17, 1]] },
  { sev: 'high', svc: ['checkout-gateway', 'search-api'], titles: ['504 gateway timeouts at checkout', 'Upstream timeouts on search requests'],
    err: 'upstream timed out (110: Connection timed out) while reading response header from upstream',
    logs: [['WARN', 'p99 latency 6.4s on POST /api/checkout'], ['ERROR', 'upstream timed out (110: Connection timed out) while reading response header from upstream'], ['ERROR', '504 Gateway Time-out'], ['WARN', 'CPU at 94% on 3 of 4 backend pods'], ['INFO', 'Autoscaler waiting for cooldown']],
    frames: [['ngx_http_upstream_process_header', 'nginx/http/ngx_http_upstream.c', 2411, 0], ['CheckoutClient.submit', '/app/src/checkout/client.js', 88, 1]] },
  { sev: 'medium', svc: ['auth-service', 'checkout-gateway'], titles: ['Users logged out with expired tokens', 'JWT verification failing for some clients'],
    err: 'JsonWebTokenError: jwt expired',
    logs: [['INFO', 'POST /auth/refresh 200'], ['WARN', '401 Unauthorized spike: 340 in 5 minutes'], ['ERROR', 'JsonWebTokenError: jwt expired'], ['WARN', 'Clock offset detected on host auth-2: 94s'], ['INFO', 'Token refresh job delayed']],
    frames: [['verify', '/app/node_modules/jsonwebtoken/verify.js', 152, 0], ['authMiddleware', '/app/src/middleware/auth.js', 31, 1]] },
  { sev: 'critical', svc: ['inventory-db', 'notification-hub'], titles: ['Disk full on database volume', 'Writes failing: no space left on device'],
    err: 'Error: ENOSPC: no space left on device, write',
    logs: [['WARN', 'Disk usage at 96% on /var/lib/data'], ['ERROR', 'Error: ENOSPC: no space left on device, write'], ['ERROR', 'Failed to write WAL segment'], ['WARN', 'Log directory is 41 GB, no rotation configured'], ['INFO', 'Alert: disk_free below 5%']],
    frames: [['WriteStream._write', 'node:internal/fs/streams', 417, 0], ['appendEvent', '/app/src/store/events.js', 73, 1]] },
]

export const levelOf = (l) => (/error|exception|fatal|fail|refused|killed/i.test(l) ? 'ERROR' : /warn|retry|slow|timeout/i.test(l) ? 'WARN' : 'INFO')

export function buildLogs(text, start) {
  return text.split('\n').map((l) => l.trim()).filter(Boolean).slice(0, 60).map((msg, i) => ({ t: start + i * 3500, level: levelOf(msg), msg }))
}

export function makeSeed() {
  const now = Date.now()
  const r = rng(11)
  const pick = (a) => a[Math.floor(r() * a.length)]
  let n = 0
  const ev = (t, text, actor, kind) => ({ id: `ev${++n}`, t: Math.min(t, now), text, actor, kind })

  const members = [
    { id: 'u1', name: 'Ayesha Malik', email: 'ayesha@northwind.dev', role: 'Owner', status: 'active' },
    { id: 'u2', name: 'Daniyal Raza', email: 'daniyal@northwind.dev', role: 'Admin', status: 'active' },
    { id: 'u3', name: 'Sara Ahmed', email: 'sara@northwind.dev', role: 'Responder', status: 'active' },
    { id: 'u4', name: 'Omar Farooq', email: 'omar@northwind.dev', role: 'Responder', status: 'active' },
    { id: 'u5', name: 'Hina Qureshi', email: 'hina@northwind.dev', role: 'Responder', status: 'active' },
    { id: 'u6', name: 'Bilal Khan', email: 'bilal@northwind.dev', role: 'Viewer', status: 'active' },
    { id: 'u7', name: 'new.hire@northwind.dev', email: 'new.hire@northwind.dev', role: 'Responder', status: 'invited' },
  ]
  const staff = members.filter((m) => m.role !== 'Viewer' && m.status === 'active')

  const incidents = []
  for (let i = 0; i < 36; i++) {
    const t = pick(TEMPLATES)
    const age = Math.pow(r(), 1.5) * 14 * 24 * H + 25 * M
    const createdAt = now - age
    const x = r()
    const status = age > 72 * H ? (r() < 0.92 ? 'resolved' : 'mitigated') : x < 0.3 ? 'open' : x < 0.55 ? 'investigating' : x < 0.7 ? 'mitigated' : 'resolved'
    const sev = r() < 0.25 && t.sev !== 'low' ? SEVERITIES[SEVERITIES.indexOf(t.sev) + 1] : t.sev
    const assignee = status !== 'open' || r() < 0.4 ? pick(staff) : null
    const resolvedAt = status === 'resolved' ? Math.min(now - M, createdAt + (0.4 + r() * 8) * H) : null
    const timeline = [ev(createdAt, 'Alert triggered by monitoring', 'Datadog', 'alert'), ev(createdAt + 2 * M, 'On-call engineer paged', 'PagerDuty', 'page')]
    if (assignee) timeline.push(ev(createdAt + 6 * M, `Assigned to ${assignee.name}`, 'Daniyal Raza', 'assign'))
    if (status !== 'open') timeline.push(ev(createdAt + 14 * M, 'Status changed to Investigating', assignee.name, 'status'))
    if (status === 'mitigated' || status === 'resolved') timeline.push(ev(createdAt + (35 + r() * 60) * M, 'Status changed to Mitigated', assignee.name, 'status'))
    if (resolvedAt) timeline.push(ev(resolvedAt, 'Status changed to Resolved', assignee.name, 'status'))
    const start = createdAt - 2 * M
    incidents.push({
      title: pick(t.titles), service: pick(t.svc), severity: sev, status, assigneeId: assignee?.id || null,
      createdAt, resolvedAt, env: r() < 0.9 ? 'Production' : 'Staging',
      logText: [t.err, ...t.logs.map((l) => l[1])].join('\n'),
      logs: t.logs.map((l, k) => ({ t: start + k * 38000, level: l[0], msg: l[1] })),
      stack: { error: t.err, frames: t.frames.map(([fn, file, line, app]) => ({ fn, file, line, col: 8 + (line % 31), app: !!app })) },
      timeline,
    })
  }
  incidents.sort((a, b) => a.createdAt - b.createdAt).forEach((inc, i) => { inc.id = `INC-${1001 + i}` })
  incidents.reverse()

  const audit = [
    ['Daniyal Raza', 'Connected integration', 'Sentry', 5],
    ['Ayesha Malik', 'Changed role to Admin', 'Daniyal Raza', 26],
    ['Ayesha Malik', 'Invited member', 'new.hire@northwind.dev', 49],
    ['Daniyal Raza', 'Updated organization settings', 'Notifications', 77],
    ['Ayesha Malik', 'Connected integration', 'PagerDuty', 130],
    ['Daniyal Raza', 'Connected integration', 'Slack', 190],
  ].map(([actor, action, target, h], i) => ({ id: `a${i}`, t: now - h * H, actor, action, target }))

  const integrations = [
    { id: 'slack', name: 'Slack', desc: 'Post incident updates to a channel.', color: '#4a154b', connected: true },
    { id: 'pagerduty', name: 'PagerDuty', desc: 'Page the on-call engineer automatically.', color: '#06a45f', connected: true },
    { id: 'datadog', name: 'Datadog', desc: 'Create incidents from monitor alerts.', color: '#632ca6', connected: true },
    { id: 'sentry', name: 'Sentry', desc: 'Attach stack traces from error events.', color: '#362d59', connected: true },
    { id: 'github', name: 'GitHub', desc: 'Link deploys and pull requests to incidents.', color: '#24292f', connected: false },
    { id: 'jira', name: 'Jira', desc: 'Create follow-up tickets from a postmortem.', color: '#0052cc', connected: false },
  ]
  const org = { name: 'Northwind Labs', slug: 'northwind', timezone: 'UTC', retention: '90', defaultSeverity: 'medium', autoPage: true, digest: true, requireMfa: false }
  return { incidents, members, audit, integrations, org }
}
