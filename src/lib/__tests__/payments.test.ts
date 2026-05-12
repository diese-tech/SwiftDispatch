import { describe, it, expect, vi } from 'vitest'
import { getPaymentProvider, ManualPaymentProvider, StripePaymentProvider, SquarePaymentProvider } from '../payments/index'

vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: () => ({
    rpc: () => ({ single: async () => ({ data: 1001, error: null }) }),
    from: () => ({
      insert: () => ({
        select: () => ({
          single: async () => ({ data: null, error: new Error('no db in test') }),
        }),
      }),
      select: () => ({
        eq: () => ({
          single: async () => ({ data: null, error: null }),
        }),
        or: () => ({
          limit: () => ({
            maybeSingle: async () => ({ data: null, error: null }),
          }),
        }),
      }),
    }),
  }),
}))

describe('getPaymentProvider factory', () => {
  it('returns ManualPaymentProvider for manual', () => {
    expect(getPaymentProvider('manual')).toBeInstanceOf(ManualPaymentProvider)
  })

  it('returns ManualPaymentProvider as default', () => {
    expect(getPaymentProvider('')).toBeInstanceOf(ManualPaymentProvider)
  })

  it('returns StripePaymentProvider for stripe', () => {
    expect(getPaymentProvider('stripe')).toBeInstanceOf(StripePaymentProvider)
  })

  it('returns SquarePaymentProvider for square', () => {
    expect(getPaymentProvider('square')).toBeInstanceOf(SquarePaymentProvider)
  })
})

describe('StripePaymentProvider', () => {
  const provider = new StripePaymentProvider()

  it('returns fallback invoice details on DB error', async () => {
    const result = await provider.createInvoice({
      job: { id: 'j1', ref: 'ref1' },
      customer: { name: 'Test', phone: '555-0001' },
      lineItems: [],
      totalAmount: 100,
    })

    expect(result.invoiceId).toBe('stripe-j1')
    expect(result.invoiceUrl).toBe('/invoice/j1')
  })

  it('returns pending status when invoice is not found', async () => {
    await expect(provider.getPaymentStatus('inv-1')).resolves.toEqual({ status: 'pending' })
  })
})

describe('SquarePaymentProvider', () => {
  const provider = new SquarePaymentProvider()

  it('createInvoice throws when Square is not connected for the company', async () => {
    await expect(provider.createInvoice({
      job: { id: 'j1', ref: 'ref1' },
      company: { id: 'company-1', paymentConfig: {} },
      customer: { name: 'Test', phone: '555-0001' },
      lineItems: [],
      totalAmount: 100,
    })).rejects.toThrow('Square is not connected for this company')
  })
})

describe('ManualPaymentProvider', () => {
  it('returns internal invoice URL pattern on DB error (fallback)', async () => {
    const provider = new ManualPaymentProvider()
    const result = await provider.createInvoice({
      job: { id: 'test-job-id', ref: 'REF-001' },
      customer: { name: 'Jane Doe', phone: '555-1234' },
      lineItems: [],
      totalAmount: 250,
    })
    expect(result.invoiceUrl).toContain('/invoice/test-job-id')
    expect(result.totalAmount).toBe(250)
  })
})
