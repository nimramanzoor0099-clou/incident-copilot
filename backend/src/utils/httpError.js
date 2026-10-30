export class HttpError extends Error {
  constructor(status, message, details) {
    super(message)
    this.status = status
    this.details = details
  }
}
export const badRequest = (m, d) => new HttpError(400, m, d)
export const notFound = (m = 'Not found') => new HttpError(404, m)
export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)
