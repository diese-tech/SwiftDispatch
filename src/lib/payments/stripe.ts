// TODO: Implement using Stripe API — https://stripe.com/docs/api/invoices
import type { PaymentProvider, InvoiceResult, PaymentStatus, LineItem } from './types'

export class StripePaymentProvider implements PaymentProvider {
  async createInvoice(_params: {
    job: { id: string; ref: string }
    customer: { name: string; phone: string; email?: string }
    lineItems: LineItem[]
    totalAmount: number
  }): Promise<InvoiceResult> {
    throw new Error('Not implemented — configure Stripe credentials in admin settings')
  }

  async getPaymentStatus(_invoiceId: string): Promise<PaymentStatus> {
    throw new Error('Not implemented — configure Stripe credentials in admin settings')
  }
}
