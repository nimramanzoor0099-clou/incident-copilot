export function reportToMarkdown(r) {
  const lines = []
  lines.push(`# ${r.title}`)
  lines.push('')
  lines.push(`**Severity:** ${r.severity}  |  **Category:** ${r.category}  |  **Confidence:** ${r.confidence}%`)
  lines.push(`**Service:** ${r.context.service}  |  **Environment:** ${r.context.environment}  |  **Stack:** ${r.context.stack}`)
  lines.push('')
  lines.push(r.summary)
  if (r.evidence?.length) {
    lines.push('', '## Evidence', '```', ...r.evidence, '```')
  }
  lines.push('', '## Possible causes')
  r.causes.forEach((c) => {
    lines.push(`- **${c.title}** (${c.likelihood}%): ${c.detail} _Check:_ ${c.check}`)
  })
  lines.push('', '## How to fix it')
  r.fixes.forEach((f, i) => {
    lines.push(`${i + 1}. **${f.title}.** ${f.detail}`)
    if (f.command) lines.push('   ```', ...f.command.split('\n').map((l) => '   ' + l), '   ```')
  })
  lines.push('', '## Prevent it')
  r.prevention.forEach((p) => lines.push(`- ${p}`))
  return lines.join('\n')
}

export function timeAgo(ts) {
  const s = Math.max(1, Math.round((Date.now() - ts) / 1000))
  if (s < 60) return 'just now'
  const m = Math.round(s / 60)
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h} h ago`
  return `${Math.round(h / 24)} d ago`
}
