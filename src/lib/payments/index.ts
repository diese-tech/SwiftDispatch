import type { PaymentProvider } from './types'
import { ManualPaymentProvider } from './manual'
import { StripePaymentProvider } from './stripe'
import { SquarePaymentProvider } from './square'

export { ManualPaymentProvider } from './manual'
export { StripePaymentProvider } from './stripe'
export { SquarePaymentProvider } from './square'
export type { PaymentProvider, InvoiceResult, PaymentStatus, LineItem } from './types'

export function getPaymentProvider(provider: string): PaymentProvider {
  switch (provider) {
    case 'stripe': return new StripePaymentProvider()
    case 'square': return new SquarePaymentProvider()
    case 'manual':
    default: return new ManualPaymentProvider()
  }
}
