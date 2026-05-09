export function requireWorkerSecret(request: Request): void {
  const configuredSecret = process.env.INTERNAL_WORKER_SECRET?.trim()
  if (!configuredSecret) {
    throw new Error('INTERNAL_WORKER_SECRET is not configured')
  }

  const authorization = request.headers.get('authorization')?.trim()
  const expected = `Bearer ${configuredSecret}`
  if (authorization !== expected) {
    throw new Error('Unauthorized worker request')
  }
}
