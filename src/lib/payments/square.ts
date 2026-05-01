// TODO: Implement using Square Invoices API — https://developer.squareup.com/reference/square/invoices-api
import type { PaymentProvider, InvoiceResult, PaymentStatus, LineItem } from './types'

export class SquarePaymentProvider implements PaymentProvider {
  async createInvoice(_params: {
    job: { id: string; ref: string }
    customer: { name: string; phone: string; email?: string }
    lineItems: LineItem[]
    totalAmount: number
  }): Promise<InvoiceResult> {
    throw new Error('Not implemented — configure Square credentials in admin settings')
  }

  async getPaymentStatus(_invoiceId: string): Promise<PaymentStatus> {
    throw new Error('Not implemented — configure Square credentials in admin settings')
  }
}
