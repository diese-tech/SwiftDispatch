import { describe, it, expect, beforeAll } from 'vitest'
import { generateTechToken, verifyTechToken } from '../techToken'
import jwt from 'jsonwebtoken'

beforeAll(() => {
  process.env.TECH_TOKEN_SECRET = 'test-secret-for-vitest-only'
})

describe('techToken', () => {
  it('valid token roundtrip', () => {
    const token = generateTechToken({ jobId: 'job-123', action: 'en_route' })
    const decoded = verifyTechToken(token)
    expect(decoded.jobId).toBe('job-123')
    expect(decoded.action).toBe('en_route')
  })

  it('roundtrip for arrived action', () => {
    const token = generateTechToken({ jobId: 'job-456', action: 'arrived' })
    const decoded = verifyTechToken(token)
    expect(decoded.action).toBe('arrived')
  })

  it('roundtrip for complete action', () => {
    const token = generateTechToken({ jobId: 'job-789', action: 'complete' })
    const decoded = verifyTechToken(token)
    expect(decoded.action).toBe('complete')
  })

  it('tampered token throws', () => {
    const token = generateTechToken({ jobId: 'job-123', action: 'en_route' })
    const tampered = token.slice(0, -5) + 'XXXXX'
    expect(() => verifyTechToken(tampered)).toThrow()
  })

  it('expired token throws', () => {
    const expired = jwt.sign(
      { jobId: 'job-123', action: 'en_route' },
      'test-secret-for-vitest-only',
      { expiresIn: -1 }
    )
    expect(() => verifyTechToken(expired)).toThrow()
  })

  it('wrong action type is rejected', () => {
    const malformed = jwt.sign(
      { jobId: 'job-123', action: 'invalid_action' },
      'test-secret-for-vitest-only',
      { expiresIn: '24h' }
    )
    expect(() => verifyTechToken(malformed)).toThrow()
  })
})
