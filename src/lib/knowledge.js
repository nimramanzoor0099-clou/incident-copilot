// Built-in knowledge base used by the sample analysis engine.
// Each entry maps an error signature to a structured diagnosis.
// A real AI backend should return the same shape (see README).

export const KNOWLEDGE = [
  {
    id: 'oom',
    test: /OOMKilled|out of memory|heap limit|exit code:?\s*137|Killed process|MemoryError|OutOfMemoryError/i,
    category: 'Resources',
    severity: 'critical',
    confidence: 90,
    title: 'Process ran out of memory and was killed',
    summary:
      'The process hit its memory limit and the runtime or the kernel terminated it. Under orchestration it then restarts, runs out again, and repeats.',
    causes: [
      { title: 'Memory limit is lower than real usage', likelihood: 70, detail: 'Container or runtime limits are set below what the workload needs at normal load, so any traffic bump pushes it over.', check: 'Compare the memory limit with usage in your metrics over the last 24 hours.' },
      { title: 'Memory leak after a recent release', likelihood: 55, detail: 'Objects, listeners or caches are retained and never released, so usage climbs until the limit.', check: 'Look for a sawtooth that climbs after each restart and began at the last deploy.' },
      { title: 'One request loads too much data', likelihood: 40, detail: 'An unbounded query, large file or big export is loaded fully into memory.', check: 'Match the restart times against requests or jobs that return very large payloads.' },
    ],
    fixes: [
      { title: 'Confirm the kill reason', detail: 'Check that the last termination reason is memory, not a failed health probe.', command: 'kubectl describe pod <pod-name> | grep -A6 "Last State"' },
      { title: 'See current usage against the limit', detail: 'Find out how close normal traffic runs to the ceiling.', command: 'kubectl top pod <pod-name> --containers' },
      { title: 'Raise the limit to stop the loop', detail: 'Give the workload headroom now so you can investigate calmly. Treat this as a stopgap.', command: 'kubectl set resources deployment/<name> --limits=memory=1Gi --requests=memory=512Mi' },
      { title: 'Capture a heap snapshot', detail: 'Take a snapshot at high usage and compare it with one from after startup to find what grows.', command: 'node --heapsnapshot-signal=SIGUSR2 server.js' },
    ],
    prevention: [
      'Alert when memory passes 80% of the limit, before the kill.',
      'Stream or paginate large reads instead of loading them whole.',
      'Add a load test that watches memory across a long run.',
    ],
  },
  {
    id: 'crashloop',
    test: /CrashLoopBackOff|ImagePullBackOff|ErrImagePull|Back-off restarting/i,
    category: 'Deployment',
    severity: 'high',
    confidence: 86,
    title: 'Container keeps crashing or cannot start',
    summary:
      'Kubernetes starts the container, it exits or cannot be pulled, and the retry delay grows each time. The real error is in the container logs or the pod events.',
    causes: [
      { title: 'App exits on startup', likelihood: 65, detail: 'A missing environment variable, bad config or failed dependency check makes the process exit immediately.', check: 'Read the logs of the previous container instance.' },
      { title: 'Image cannot be pulled', likelihood: 45, detail: 'Wrong tag, missing registry credentials or a deleted image.', check: 'Look for "Failed to pull image" in the pod events.' },
      { title: 'Probe kills a slow starter', likelihood: 35, detail: 'The liveness probe fires before the app is ready, so it restarts forever.', check: 'Compare the probe delay with real startup time.' },
    ],
    fixes: [
      { title: 'Read the crashed container logs', detail: 'The --previous flag shows the output from just before the crash.', command: 'kubectl logs <pod-name> --previous' },
      { title: 'Check pod events', detail: 'Events name pull failures, probe failures and scheduling problems.', command: 'kubectl describe pod <pod-name>' },
      { title: 'Roll back if this began with a deploy', detail: 'Return to the last healthy revision while you fix forward.', command: 'kubectl rollout undo deployment/<name>' },
    ],
    prevention: [
      'Validate required configuration at build time and fail the pipeline.',
      'Use a startup probe for slow applications.',
      'Roll out gradually so one bad release cannot take every pod down.',
    ],
  },
  {
    id: 'disk',
    test: /ENOSPC|no space left on device|disk (is )?full|Disk quota exceeded/i,
    category: 'Infrastructure',
    severity: 'critical',
    confidence: 92,
    title: 'Disk is full',
    summary:
      'The volume has no free space or no free inodes, so writes fail. Databases, logs and uploads usually stop working first.',
    causes: [
      { title: 'Logs growing without rotation', likelihood: 65, detail: 'Debug logging or a noisy error loop fills the volume.', check: 'Find the largest directories under /var/log and the app log path.' },
      { title: 'Temp files or old artifacts piling up', likelihood: 45, detail: 'Uploads, build caches or container layers are never cleaned.', check: 'Check the size of /tmp and the Docker data directory.' },
      { title: 'Out of inodes, not bytes', likelihood: 20, detail: 'Millions of tiny files exhaust inodes while space looks free.', check: 'Compare df -h with df -i.' },
    ],
    fixes: [
      { title: 'Find what is using the space', detail: 'Start from the root and drill into the biggest directory.', command: 'du -xh / --max-depth=2 2>/dev/null | sort -rh | head -20' },
      { title: 'Check inodes', detail: 'If inode use is near 100%, delete small files rather than large ones.', command: 'df -i' },
      { title: 'Free space safely', detail: 'Remove unused container data and trim old journal logs.', command: 'docker system prune -f && journalctl --vacuum-size=200M' },
    ],
    prevention: [
      'Rotate and cap log size on every service.',
      'Alert at 80% disk and again at 90%.',
      'Expire temporary files with a scheduled cleanup job.',
    ],
  },
  {
    id: 'db-pool',
    test: /too many connections|remaining connection slots|connection pool|pool.*(exhausted|timeout)|deadlock detected|could not obtain (a )?connection|timeout acquiring/i,
    category: 'Database',
    severity: 'high',
    confidence: 84,
    title: 'Database connections exhausted',
    summary:
      'The app or the database has no free connections. New requests wait, then time out, and the failure spreads to everything that touches the database.',
    causes: [
      { title: 'Connections are not being released', likelihood: 60, detail: 'An error path or missing finally block leaves connections checked out.', check: 'Watch active connections: they should fall when traffic falls.' },
      { title: 'Pool size is too small or too large', likelihood: 45, detail: 'Many app instances times the pool size can exceed the database max_connections.', check: 'Multiply instances by pool size and compare with the server limit.' },
      { title: 'A slow query holds connections', likelihood: 40, detail: 'One long query or lock makes others queue until the pool is empty.', check: 'List the longest-running queries right now.' },
    ],
    fixes: [
      { title: 'See who holds the connections', detail: 'Group by state and application to spot idle-in-transaction sessions.', command: "SELECT state, count(*) FROM pg_stat_activity GROUP BY state;" },
      { title: 'Find the slowest running queries', detail: 'Look for anything running for minutes.', command: "SELECT pid, now() - query_start AS runtime, query FROM pg_stat_activity WHERE state <> 'idle' ORDER BY runtime DESC LIMIT 10;" },
      { title: 'Release stuck sessions', detail: 'End only the sessions you have identified as blocked or abandoned.', command: 'SELECT pg_terminate_backend(<pid>);' },
    ],
    prevention: [
      'Always release connections in a finally block or use a pool helper that does.',
      'Set statement and idle-in-transaction timeouts.',
      'Put a connection pooler such as PgBouncer in front of the database.',
    ],
  },
  {
    id: 'cors',
    test: /CORS|Access-Control-Allow-Origin|blocked by CORS policy/i,
    category: 'Web',
    severity: 'medium',
    confidence: 88,
    title: 'Browser blocked a cross-origin request',
    summary:
      'The browser refused to hand the response to your page because the server did not allow that origin. The request itself often reached the server.',
    causes: [
      { title: 'Origin is missing from the allowed list', likelihood: 65, detail: 'A new domain, port or preview URL was never added to the CORS configuration.', check: 'Compare the Origin request header with the server allow list.' },
      { title: 'Preflight request fails', likelihood: 50, detail: 'The OPTIONS request is rejected, redirected or lacks the allowed methods and headers.', check: 'Inspect the OPTIONS call in the network tab.' },
      { title: 'Proxy strips CORS headers', likelihood: 30, detail: 'A gateway or CDN overrides or drops the headers on error responses.', check: 'Call the endpoint with curl and read the response headers.' },
    ],
    fixes: [
      { title: 'Check the preflight response', detail: 'It must return 2xx with the allow headers.', command: 'curl -i -X OPTIONS https://api.example.com/v1/items -H "Origin: https://app.example.com" -H "Access-Control-Request-Method: POST"' },
      { title: 'Allow the exact origin', detail: 'Add the origin to the allow list. Avoid * when sending cookies or auth headers.' },
      { title: 'Send headers on error responses too', detail: 'Make sure 4xx and 5xx responses carry the same CORS headers.' },
    ],
    prevention: [
      'Keep the allowed origins in configuration per environment.',
      'Add an integration test that sends a preflight request.',
    ],
  },
  {
    id: 'conn-refused',
    test: /ECONNREFUSED|connection refused|ECONNRESET|connect: connection|No route to host/i,
    category: 'Network',
    severity: 'high',
    confidence: 85,
    title: 'Service refused the connection',
    summary:
      'Your app reached the host, but nothing was listening on that port or something actively rejected the connection. Callers see 5xx errors while it lasts.',
    causes: [
      { title: 'Target service is down or restarting', likelihood: 65, detail: 'The database or API process crashed, was redeployed or has not finished starting.', check: 'Check that the service is running and its restart count is stable.' },
      { title: 'Wrong host, port or environment value', likelihood: 45, detail: 'A config change or secret rotation points the app at an address that no longer exists.', check: 'Print the resolved host and port the app is using.' },
      { title: 'Firewall or security group change', likelihood: 30, detail: 'A network rule now blocks the port between the two services.', check: 'Test the port from the same network as the failing app.' },
    ],
    fixes: [
      { title: 'Test the port from the app host', detail: 'This separates a network problem from an application problem.', command: 'nc -vz <host> <port>' },
      { title: 'Check the target is running', detail: 'Look at its status and recent restarts.', command: 'kubectl get pods -l app=<service> -o wide' },
      { title: 'Verify configuration values', detail: 'Compare the host and port in the environment with the ones you expect.', command: 'kubectl exec <pod-name> -- printenv | grep -i -E "HOST|PORT|URL"' },
      { title: 'Add retry with backoff', detail: 'Retry short outages instead of failing the request on the first refusal.' },
    ],
    prevention: [
      'Use readiness probes so traffic only reaches ready instances.',
      'Retry with exponential backoff and a circuit breaker.',
      'Review firewall and config changes in the same change window as releases.',
    ],
  },
  {
    id: 'auth',
    test: /jwt expired|token expired|invalid token|TokenExpired|401 Unauthorized|403 Forbidden|Unauthorized|invalid signature/i,
    category: 'Security',
    severity: 'medium',
    confidence: 80,
    title: 'Authentication or permission check failed',
    summary:
      'The request was rejected because the credential was missing, expired, invalid, or lacks permission for the action.',
    causes: [
      { title: 'Token or key has expired', likelihood: 60, detail: 'A short-lived token was not refreshed, or an API key was rotated.', check: 'Decode the token and read its exp claim.' },
      { title: 'Signing key or secret mismatch', likelihood: 45, detail: 'The service verifying the token uses a different secret than the one that issued it.', check: 'Compare key IDs between the issuer and the verifier.' },
      { title: 'Clock drift between servers', likelihood: 25, detail: 'Servers disagree on the time, so valid tokens look expired or not yet valid.', check: 'Compare system time on both hosts.' },
    ],
    fixes: [
      { title: 'Inspect the token claims', detail: 'Check the expiry, audience and issuer without sharing the token outside your team.', command: 'echo "<token>" | cut -d. -f2 | base64 -d 2>/dev/null' },
      { title: 'Check server time', detail: 'Confirm clocks are synced.', command: 'timedatectl status' },
      { title: 'Refresh or reissue the credential', detail: 'Rotate the key or force a token refresh, then confirm callers pick it up.' },
    ],
    prevention: [
      'Refresh tokens before they expire.',
      'Sync clocks with NTP on every host.',
      'Allow a small clock-skew tolerance when verifying tokens.',
    ],
  },
  {
    id: 'null-ref',
    test: /Cannot read propert(y|ies) of (undefined|null)|is not a function|NullPointerException|NoneType|undefined is not|TypeError/i,
    category: 'Application code',
    severity: 'high',
    confidence: 86,
    title: 'Code used a value that was not there',
    summary:
      'A line of code expected an object but got undefined or null, so it threw. The failing file and line are in the stack trace.',
    causes: [
      { title: 'Data was missing or shaped differently', likelihood: 65, detail: 'An API, query or form returned no record or a field the code assumed would exist.', check: 'Log the value one step before the failing line.' },
      { title: 'Unawaited async call', likelihood: 40, detail: 'A promise is used before it resolves, so the result is still undefined.', check: 'Look for a missing await on the call that feeds the failing line.' },
      { title: 'Recent change to a response format', likelihood: 35, detail: 'An upstream service or schema change renamed or removed a field.', check: 'Compare the payload now with one from before the incident.' },
    ],
    fixes: [
      { title: 'Open the failing line from the stack trace', detail: 'Find which value on that line can be missing.' },
      { title: 'Guard the access', detail: 'Handle the missing case explicitly, for example with optional chaining and a clear error.', command: 'const id = invoice?.id\nif (!id) throw new NotFoundError("Invoice not found")' },
      { title: 'Add a test for the missing-data case', detail: 'Reproduce the failing input so it cannot return unnoticed.' },
    ],
    prevention: [
      'Validate external data at the boundary with a schema.',
      'Turn on strict null checks, for example with TypeScript strict mode.',
      'Return a clear 404 for missing records instead of letting the code throw.',
    ],
  },
  {
    id: 'timeout',
    test: /504|502|upstream timed out|gateway time-?out|bad gateway|ETIMEDOUT|request timed out|timeout of \d+ms/i,
    category: 'Network',
    severity: 'high',
    confidence: 82,
    title: 'Upstream service is too slow or unreachable',
    summary:
      'The gateway waited for your backend and gave up. Users see 502 or 504 errors, usually because the backend is overloaded, stuck, or restarting.',
    causes: [
      { title: 'Backend is overloaded', likelihood: 60, detail: 'CPU, threads or connections are saturated, so requests queue past the timeout.', check: 'Check CPU, request latency and queue depth on the backend.' },
      { title: 'A slow dependency behind it', likelihood: 50, detail: 'The backend waits on a database or third-party API that has slowed down.', check: 'Compare latency of each downstream call in your traces.' },
      { title: 'Timeout is shorter than the work', likelihood: 30, detail: 'The gateway timeout is lower than the real duration of a heavy request.', check: 'Compare the gateway timeout with the p99 latency of that route.' },
    ],
    fixes: [
      { title: 'Check the backend directly', detail: 'Bypass the gateway to see whether the backend itself is slow.', command: 'curl -w "%{time_total}s\\n" -o /dev/null -s http://<backend-host>:<port>/health' },
      { title: 'Look at recent errors and latency', detail: 'Find when it started and whether it lines up with a deploy.', command: 'kubectl logs deploy/<name> --since=30m | grep -i -E "error|timeout"' },
      { title: 'Scale out while you investigate', detail: 'Add capacity to relieve pressure.', command: 'kubectl scale deployment/<name> --replicas=6' },
      { title: 'Move long work off the request path', detail: 'Return quickly and finish heavy work in a background job.' },
    ],
    prevention: [
      'Set timeouts at every hop, each shorter than the one above it.',
      'Autoscale on latency or queue depth, not only CPU.',
      'Add a circuit breaker so one slow dependency cannot stall everything.',
    ],
  },
]

export const FALLBACK = {
  id: 'generic',
  category: 'Unclassified',
  severity: 'medium',
  confidence: 38,
  title: 'No known pattern matched this error',
  summary:
    'This log does not match a common failure signature. Use the steps below to narrow it down, and add the full stack trace and the time it started for a sharper result.',
  causes: [
    { title: 'A recent change introduced it', likelihood: 55, detail: 'Most incidents begin shortly after a deploy, config change or dependency update.', check: 'Compare the first error time with your deploy and config history.' },
    { title: 'A dependency is degraded', likelihood: 40, detail: 'A database, cache or third-party API may be slow or failing.', check: 'Check the health and latency of every downstream service.' },
    { title: 'Traffic or data shape changed', likelihood: 30, detail: 'A spike or an unusual payload may be exposing a hidden bug.', check: 'Compare request volume and payload sizes with last week.' },
  ],
  fixes: [
    { title: 'Find the first occurrence', detail: 'The earliest error is usually closer to the cause than the loudest one.', command: 'kubectl logs deploy/<name> --since=2h | grep -i error | head -20' },
    { title: 'Check what changed', detail: 'List recent releases and roll back if the timing matches.', command: 'kubectl rollout history deployment/<name>' },
    { title: 'Reproduce with the failing input', detail: 'Capture the exact request or job that fails and run it in staging.' },
  ],
  prevention: [
    'Add structured logging with a request ID on every line.',
    'Keep a short runbook for each service and link it from alerts.',
  ],
}
