export const SAMPLES = [
  {
    label: 'Database refused connection',
    service: 'payments-api',
    stack: 'Node.js',
    log: `Error: connect ECONNREFUSED 10.0.4.17:5432
    at TCPConnectWrap.afterConnect [as oncomplete] (node:net:1595:16)
    at Pool._pulseQueue (/app/node_modules/pg-pool/index.js:148:17)
[payments-api] GET /v1/charges 500 - upstream database unavailable`,
  },
  {
    label: 'Pod killed (OOM)',
    service: 'report-worker',
    stack: 'Kubernetes',
    log: `State:          Terminated
  Reason:       OOMKilled
  Exit Code:    137
Restart Count:  9
<--- Last few GCs --->
FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory`,
  },
  {
    label: 'Undefined property crash',
    service: 'billing-web',
    stack: 'Node.js',
    log: `TypeError: Cannot read properties of undefined (reading 'id')
    at getInvoice (/app/src/billing/invoice.js:42:28)
    at async handler (/app/src/routes/invoices.js:17:19)
Unhandled promise rejection - process exiting`,
  },
  {
    label: 'Gateway timeout at checkout',
    service: 'checkout-gateway',
    stack: 'Other',
    log: `upstream timed out (110: Connection timed out) while reading response header from upstream,
client: 203.0.113.9, server: shop.example.com,
request: "POST /api/checkout HTTP/1.1", upstream: "http://10.0.2.31:8080/api/checkout"
504 Gateway Time-out`,
  },
]
