import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import type { PaymentProvider, InvoiceResult, PaymentStatus, LineItem } from './types'

export class ManualPaymentProvider implements PaymentProvider {
  async createInvoice(params: {
    job: { id: string; ref: string }
    customer: { name: string; phone: string; email?: string }
    lineItems: LineItem[]
    totalAmount: number
  }): Promise<InvoiceResult> {
    const supabase = createSupabaseAdminClient()
    const year = new Date().getFullYear()
    const { data: seq } = await supabase.rpc('nextval', { seq_name: 'invoice_seq' }).single()
    const invoiceNumber = `INV-${year}-${seq ?? Date.now()}`

    const { data, error } = await supabase
      .from('invoices')
      .insert({
        job_id: params.job.id,
        invoice_number: invoiceNumber,
        customer_name: params.customer.name,
        customer_phone: params.customer.phone,
        customer_email: params.customer.email ?? null,
        total_amount: params.totalAmount,
        status: 'pending',
        invoice_url: `/invoice/${params.job.id}`,
      })
      .select('id')
      .single()

    if (error || !data) {
      // Fallback: return a URL even if DB insert fails
      return {
        invoiceId: `manual-${params.job.id}`,
        invoiceUrl: `/invoice/${params.job.id}`,
        totalAmount: params.totalAmount,
      }
    }

    return {
      invoiceId: data.id,
      invoiceUrl: `/invoice/${params.job.id}`,
      totalAmount: params.totalAmount,
    }
  }

  async getPaymentStatus(invoiceId: string): Promise<PaymentStatus> {
    const supabase = createSupabaseAdminClient()
    const { data } = await supabase
      .from('invoices')
      .select('status, paid_at')
      .eq('id', invoiceId)
      .single()

    if (!data) return { status: 'pending' }

    return {
      status: data.status as 'pending' | 'paid' | 'void',
      paidAt: data.paid_at ? new Date(data.paid_at) : undefined,
    }
  }
}
