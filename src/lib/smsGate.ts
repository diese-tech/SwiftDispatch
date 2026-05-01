export type SmsConsentType = 'intake_form' | 'verbal_logged' | 'none'

export function canSendSms(consentType: SmsConsentType): boolean {
  return consentType !== 'none'
}

export function assertSmsConsent(consentType: SmsConsentType): void {
  if (!canSendSms(consentType)) {
    throw new Error('SMS consent not obtained. Cannot send message.')
  }
}
