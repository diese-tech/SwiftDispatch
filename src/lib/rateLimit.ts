const store = new Map<string, { count: number; resetAt: number }>()
const blockedCache = new Map<string, number>()
const RATE_LIMIT_TIMEOUT_MS = 1000

function localCheckRateLimit(
  key: string,
  limit: number,
  windowMs: number
): boolean {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (entry.count >= limit) return false
  entry.count++
  return true
}

function getRedisConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim()
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim()
  if (!url || !token) return null
  return { url: url.replace(/\/$/, ""), token }
}

async function upstashCommand<T>(command: unknown[]) {
  const config = getRedisConfig()
  if (!config) throw new Error('Upstash Redis is not configured')

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), RATE_LIMIT_TIMEOUT_MS)

  try {
    const response = await fetch(config.url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(command),
      cache: 'no-store',
      signal: controller.signal,
    })

    const data = await response.json() as { result?: T; error?: string }
    if (!response.ok || data.error) {
      throw new Error(data.error ?? `Rate limit request failed: ${response.status}`)
    }

    return data.result as T
  } finally {
    clearTimeout(timeout)
  }
}

async function remoteCheckRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<boolean> {
  const now = Date.now()
  const cachedResetAt = blockedCache.get(key)
  if (cachedResetAt && cachedResetAt > now) {
    return false
  }

  const count = await upstashCommand<number>(['INCR', key])

  if (count === 1) {
    await upstashCommand<string>(['PEXPIRE', key, windowMs])
  }

  if (count > limit) {
    blockedCache.set(key, now + windowMs)
    return false
  }

  return true
}

export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<boolean> {
  if (!getRedisConfig()) {
    return localCheckRateLimit(key, limit, windowMs)
  }

  try {
    return await remoteCheckRateLimit(key, limit, windowMs)
  } catch {
    return true
  }
}
