import jwt from 'jsonwebtoken'

export type TechAction = 'en_route' | 'arrived' | 'complete'

function getSecret(): string {
  const secret = process.env.TECH_TOKEN_SECRET
  if (!secret) throw new Error('TECH_TOKEN_SECRET is not set')
  return secret
}

export function generateTechToken(payload: {
  jobId: string
  action: TechAction
}): string {
  return jwt.sign(payload, getSecret(), { expiresIn: '24h' })
}

export function verifyTechToken(token: string): {
  jobId: string
  action: TechAction
} {
  const decoded = jwt.verify(token, getSecret()) as { jobId: string; action: TechAction }
  if (!['en_route', 'arrived', 'complete'].includes(decoded.action)) {
    throw new Error('Invalid action type in token')
  }
  return decoded
}
