export interface LineItem {
  description: string
  unit_price: number
  qty: number
  unit?: 'hour' | 'unit' | 'flat'
  optional: boolean
}

export interface InvoiceResult {
  invoiceId: string
  invoiceUrl?: string
  totalAmount: number
}

export interface PaymentStatus {
  status: 'pending' | 'paid' | 'void'
  paidAt?: Date
}

export interface PaymentProvider {
  createInvoice(params: {
    job: { id: string; ref: string }
    customer: { name: string; phone: string; email?: string }
    lineItems: LineItem[]
    totalAmount: number
  }): Promise<InvoiceResult>

  getPaymentStatus(invoiceId: string): Promise<PaymentStatus>
}
