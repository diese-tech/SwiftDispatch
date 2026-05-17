import 'server-only'

const REQUIRED_ENV_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'TECH_TOKEN_SECRET',
  'INTERNAL_WORKER_SECRET',
  'NEXT_PUBLIC_APP_URL',
] as const

export function validateEnv(): void {
  const missing = REQUIRED_ENV_VARS.filter((key) => {
    const value = process.env[key]
    return !value || value.trim() === ''
  })

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables:\n${missing.map((k) => `  - ${k}`).join('\n')}\n` +
      'Check your .env.local or Vercel environment configuration.'
    )
  }

  // Warn about optional-but-important vars in non-development environments
  if (process.env.NODE_ENV === 'production') {
    const recommended = [
      'TWILIO_ACCOUNT_SID',
      'TWILIO_AUTH_TOKEN',
      'TWILIO_PHONE_NUMBER',
      'UPSTASH_REDIS_REST_URL',
      'UPSTASH_REDIS_REST_TOKEN',
    ]

    const missingRecommended = recommended.filter((key) => {
      const value = process.env[key]
      return !value || value.trim() === ''
    })

    if (missingRecommended.length > 0) {
      console.warn(
        '[SwiftDispatch] Production env warning — recommended variables not set:\n' +
        missingRecommended.map((k) => `  - ${k}`).join('\n')
      )
    }
  }
}
