import { HttpError } from '../utils/httpError.js'

export const notFoundHandler = (req, res) =>
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` })

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message, details: err.details })
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON body' })
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Request body too large' })
  console.error(err)
  res.status(500).json({ error: 'Internal server error' })
}
