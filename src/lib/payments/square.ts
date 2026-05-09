import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { callSquareApi, decryptSecret, getStoredSquareConnection } from '@/lib/square'
import type { PaymentProvider, InvoiceResult, PaymentStatus, LineItem } from './types'

export class SquarePaymentProvider implements PaymentProvider {
  async createInvoice(params: {
    job: { id: string; ref: string }
    company?: { id: string; paymentConfig?: Record<string, unknown> | null }
    customer: { name: string; phone: string; email?: string }
    lineItems: LineItem[]
    totalAmount: number
  }): Promise<InvoiceResult> {
    const companyId = params.company?.id
    const connection = getStoredSquareConnection(params.company?.paymentConfig)

    if (!companyId || !connection) {
      throw new Error('Square is not connected for this company')
    }

    const encryptedAccessToken = connection.accessTokenEncrypted
    if (!encryptedAccessToken) {
      throw new Error('Square access token is missing for this company')
    }

    const accessToken = decryptSecret(encryptedAccessToken)
    const locationId = connection.locationId

    if (!locationId) {
      throw new Error('Square location is missing for this company')
    }

    const supabase = createSupabaseAdminClient()
    const year = new Date().getFullYear()
    const { data: seq } = await supabase.rpc('nextval', { seq_name: 'invoice_seq' }).single()
    const invoiceNumber = `INV-${year}-${seq ?? Date.now()}`

    const orderResponse = await callSquareApi<{ order?: { id?: string } }>('/v2/orders', {
      method: 'POST',
      accessToken,
      body: JSON.stringify({
        order: {
          location_id: locationId,
          line_items: params.lineItems.map((item, index) => ({
            uid: `line-${index + 1}`,
            name: item.description || `Service ${index + 1}`,
            quantity: String(item.qty ?? 1),
            base_price_money: {
              amount: Math.round((item.unit_price ?? 0) * 100),
              currency: 'USD',
            },
          })),
        },
        idempotency_key: `swiftdispatch-order-${params.job.id}`,
      }),
    })

    const orderId = orderResponse.order?.id
    if (!orderId) {
      throw new Error('Square order creation did not return an order id')
    }

    const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    const amountMoney = {
      amount: Math.round(params.totalAmount * 100),
      currency: 'USD',
    }

    const invoiceResponse = await callSquareApi<{ invoice?: { id?: string } }>('/v2/invoices', {
      method: 'POST',
      accessToken,
      body: JSON.stringify({
        invoice: {
          location_id: locationId,
          order_id: orderId,
          payment_requests: [
            {
              request_type: 'BALANCE',
              due_date: dueDate,
              fixed_amount_requested_money: amountMoney,
            },
          ],
          delivery_method: 'SHARE_MANUALLY',
          title: `SwiftDispatch Invoice ${invoiceNumber}`,
          description: `Job ${params.job.ref} for ${params.customer.name}`,
          accepted_payment_methods: {
            card: true,
            square_gift_card: false,
            bank_account: false,
            buy_now_pay_later: false,
          },
        },
        idempotency_key: `swiftdispatch-invoice-${params.job.id}`,
      }),
    })

    const draftInvoiceId = invoiceResponse.invoice?.id
    if (!draftInvoiceId) {
      throw new Error('Square invoice creation did not return an invoice id')
    }

    const publishResponse = await callSquareApi<{ invoice?: { id?: string; public_url?: string } }>(`/v2/invoices/${draftInvoiceId}/publish`, {
      method: 'POST',
      accessToken,
      body: JSON.stringify({
        version: 0,
        idempotency_key: `swiftdispatch-invoice-publish-${params.job.id}`,
      }),
    })

    const publishedInvoiceId = publishResponse.invoice?.id ?? draftInvoiceId
    const publicUrl = publishResponse.invoice?.public_url ?? null

    const { error } = await supabase
      .from('invoices')
      .insert({
        job_id: params.job.id,
        company_id: companyId,
        invoice_number: invoiceNumber,
        customer_name: params.customer.name,
        customer_phone: params.customer.phone,
        customer_email: params.customer.email ?? null,
        total_amount: params.totalAmount,
        status: 'pending',
        external_invoice_id: publishedInvoiceId,
        invoice_url: publicUrl,
      })

    if (error) {
      throw new Error(error.message)
    }

    return {
      invoiceId: publishedInvoiceId,
      invoiceUrl: publicUrl ?? undefined,
      totalAmount: params.totalAmount,
    }
  }

  async getPaymentStatus(invoiceId: string): Promise<PaymentStatus> {
    const supabase = createSupabaseAdminClient()
    const { data } = await supabase
      .from('invoices')
      .select('status, paid_at')
      .or(`id.eq.${invoiceId},external_invoice_id.eq.${invoiceId}`)
      .limit(1)
      .maybeSingle()

    if (!data) return { status: 'pending' }

    return {
      status: data.status as 'pending' | 'paid' | 'void',
      paidAt: data.paid_at ? new Date(data.paid_at) : undefined,
    }
  }
}
