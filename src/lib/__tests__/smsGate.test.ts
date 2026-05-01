import { describe, it, expect } from 'vitest'
import { canSendSms, assertSmsConsent } from '../smsGate'

describe('canSendSms', () => {
  it('intake_form → true', () => {
    expect(canSendSms('intake_form')).toBe(true)
  })

  it('verbal_logged → true', () => {
    expect(canSendSms('verbal_logged')).toBe(true)
  })

  it('none → false', () => {
    expect(canSendSms('none')).toBe(false)
  })
})

describe('assertSmsConsent', () => {
  it('does not throw for intake_form', () => {
    expect(() => assertSmsConsent('intake_form')).not.toThrow()
  })

  it('does not throw for verbal_logged', () => {
    expect(() => assertSmsConsent('verbal_logged')).not.toThrow()
  })

  it('throws for none', () => {
    expect(() => assertSmsConsent('none')).toThrow('SMS consent not obtained')
  })
})
