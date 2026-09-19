/**
 * Behavior coverage for the payment provider abstraction (issue #60).
 * SquarePaymentProvider is the app's one live, real integration (three
 * sequential Square API calls, each idempotency-keyed, then a DB write) --
 * previously covered by exactly one test (the pre-flight "not connected"
 * guard). Follows the fake-Supabase-query-builder pattern established
 * elsewhere this session; @/lib/square's callSquareApi/decryptSecret/
 * getStoredSquareConnection are mocked directly rather than modeling HTTP.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getPaymentProvider, ManualPaymentProvider, StripePaymentProvider, SquarePaymentProvider } from '../payments/index'

type Row = Record<string, unknown>

const callSquareApiMock = vi.fn()
const decryptSecretMock = vi.fn()
const getStoredSquareConnectionMock = vi.fn()

vi.mock('@/lib/square', () => ({
  callSquareApi: (...args: unknown[]) => callSquareApiMock(...args),
  decryptSecret: (...args: unknown[]) => decryptSecretMock(...args),
  getStoredSquareConnection: (...args: unknown[]) => getStoredSquareConnectionMock(...args),
}))

const createSupabaseAdminClientMock = vi.fn()

vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: () => createSupabaseAdminClientMock(),
}))

function matchesFilters(row: Row, filters: [string, unknown][]) {
  return filters.every(([column, value]) => row[column] === value)
}

function makeSelectBuilder(getRows: () => Row[]) {
  const filters: [string, unknown][] = []
  let orFilters: [string, unknown][] | null = null
  const builder = {
    eq(column: string, value: unknown) {
      filters.push([column, value])
      return builder
    },
    // Real calls always use the same value for both sides, e.g.
    // `id.eq.X,external_invoice_id.eq.X` -- match either column against it.
    or(filterStr: string) {
      orFilters = filterStr.split(',').map((part) => {
        const [column, , value] = part.split('.')
        return [column, value] as [string, unknown]
      })
      return builder
    },
    limit() {
      return builder
    },
    single: async () => {
      const row = getRows().find((r) => matchesFilters(r, filters))
      return row ? { data: row, error: null } : { data: null, error: { message: 'Row not found' } }
    },
    maybeSingle: async () => {
      const row = orFilters
        ? getRows().find((r) => orFilters!.some(([column, value]) => r[column] === value))
        : getRows().find((r) => matchesFilters(r, filters))
      return { data: row ?? null, error: null }
    },
  }
  return builder
}

type InsertMode = 'success' | 'dbError'

function makeInsertBuilder(getRows: () => Row[], row: Row, mode: InsertMode) {
  const inserted = { id: `invoice-${getRows().length + 1}`, ...row }
  const builder = {
    select() {
      return {
        single: async () => {
          if (mode === 'dbError') return { data: null, error: { message: 'insert failed' } }
          getRows().push(inserted)
          return { data: { id: inserted.id }, error: null }
        },
      }
    },
    // Supports SquarePaymentProvider's `await supabase.from('invoices').insert({...})`
    // with no .select() chained.
    then(resolve: (value: { data: null; error: { message: string } | null }) => void) {
      if (mode === 'dbError') {
        resolve({ data: null, error: { message: 'insert failed' } })
        return
      }
      getRows().push(inserted)
      resolve({ data: null, error: null })
    },
  }
  return builder
}

function makeRpcBuilder(seqValue: number | null) {
  return {
    single: async () =>
      seqValue === null ? { data: null, error: { message: 'function not found' } } : { data: seqValue, error: null },
  }
}

type Db = { invoices: Row[] }
type FakeOpts = { insertMode: InsertMode; seqValue: number | null }

function createFakeSupabase(db: Db, opts: FakeOpts) {
  return {
    rpc: () => makeRpcBuilder(opts.seqValue),
    from: (table: string) => {
      if (table !== 'invoices') throw new Error(`Unexpected table in test double: ${table}`)
      return {
        insert: (row: Row) => makeInsertBuilder(() => db.invoices, row, opts.insertMode),
        select: () => makeSelectBuilder(() => db.invoices),
      }
    },
  }
}

let db: Db
let fakeOpts: FakeOpts

beforeEach(() => {
  db = { invoices: [] }
  fakeOpts = { insertMode: 'success', seqValue: 1001 }
  createSupabaseAdminClientMock.mockReset()
  createSupabaseAdminClientMock.mockImplementation(() => createFakeSupabase(db, fakeOpts))
  callSquareApiMock.mockReset()
  decryptSecretMock.mockReset()
  getStoredSquareConnectionMock.mockReset()
})

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

const createInvoiceInput = {
  job: { id: 'job-1', ref: 'REF1' },
  company: { id: 'company-1' },
  customer: { name: 'Ada Lovelace', phone: '555-0001' },
  lineItems: [],
  totalAmount: 100,
}

describe('StripePaymentProvider', () => {
  const provider = new StripePaymentProvider()

  it('returns fallback invoice details on DB error', async () => {
    fakeOpts.insertMode = 'dbError'

    const result = await provider.createInvoice({
      job: { id: 'j1', ref: 'ref1' },
      customer: { name: 'Test', phone: '555-0001' },
      lineItems: [],
      totalAmount: 100,
    })

    expect(result.invoiceId).toBe('stripe-j1')
    expect(result.invoiceUrl).toBe('/invoice/j1')
  })

  it('writes a real invoice row and returns its id on success', async () => {
    const result = await provider.createInvoice(createInvoiceInput)

    expect(db.invoices).toHaveLength(1)
    expect(db.invoices[0]).toMatchObject({
      job_id: 'job-1',
      company_id: 'company-1',
      external_invoice_id: 'stripe-job-1',
      total_amount: 100,
      status: 'pending',
    })
    expect(result.invoiceId).toBe(db.invoices[0].id)
    expect(result.invoiceUrl).toBe('/invoice/job-1')
    expect(result.totalAmount).toBe(100)
  })

  it('returns pending status when invoice is not found', async () => {
    await expect(provider.getPaymentStatus('inv-1')).resolves.toEqual({ status: 'pending' })
  })

  it('finds an invoice by its own id or by external_invoice_id, returning paid status', async () => {
    db.invoices.push({
      id: 'inv-1',
      external_invoice_id: 'ext-1',
      status: 'paid',
      paid_at: '2026-01-01T00:00:00.000Z',
    })

    const byOwnId = await provider.getPaymentStatus('inv-1')
    expect(byOwnId.status).toBe('paid')
    expect(byOwnId.paidAt).toEqual(new Date('2026-01-01T00:00:00.000Z'))

    const byExternalId = await provider.getPaymentStatus('ext-1')
    expect(byExternalId.status).toBe('paid')
  })
})

describe('ManualPaymentProvider', () => {
  const provider = new ManualPaymentProvider()

  it('returns internal invoice URL pattern on DB error (fallback)', async () => {
    fakeOpts.insertMode = 'dbError'

    const result = await provider.createInvoice({
      job: { id: 'test-job-id', ref: 'REF-001' },
      customer: { name: 'Jane Doe', phone: '555-1234' },
      lineItems: [],
      totalAmount: 250,
    })
    expect(result.invoiceUrl).toContain('/invoice/test-job-id')
    expect(result.totalAmount).toBe(250)
  })

  it('writes a real invoice row on success', async () => {
    const result = await provider.createInvoice(createInvoiceInput)

    expect(db.invoices).toHaveLength(1)
    expect(result.invoiceId).toBe(db.invoices[0].id)
  })

  it('returns pending status when invoice is not found', async () => {
    await expect(provider.getPaymentStatus('missing')).resolves.toEqual({ status: 'pending' })
  })

  it('returns a paid status with paidAt when the invoice is paid', async () => {
    db.invoices.push({ id: 'inv-1', status: 'paid', paid_at: '2026-02-01T00:00:00.000Z' })

    const result = await provider.getPaymentStatus('inv-1')

    expect(result.status).toBe('paid')
    expect(result.paidAt).toEqual(new Date('2026-02-01T00:00:00.000Z'))
  })

  it('returns a pending status with no paidAt when the invoice has not been paid', async () => {
    db.invoices.push({ id: 'inv-2', status: 'pending', paid_at: null })

    const result = await provider.getPaymentStatus('inv-2')

    expect(result.status).toBe('pending')
    expect(result.paidAt).toBeUndefined()
  })
})

describe('SquarePaymentProvider', () => {
  const provider = new SquarePaymentProvider()

  function connectedCompany(overrides: Record<string, unknown> = {}) {
    return {
      id: 'company-1',
      paymentConfig: { square: { connected: true } }, // shape doesn't matter, getStoredSquareConnection is mocked
      ...overrides,
    }
  }

  beforeEach(() => {
    getStoredSquareConnectionMock.mockReturnValue({
      accessTokenEncrypted: 'encrypted-access-token',
      refreshTokenEncrypted: 'encrypted-refresh-token',
      locationId: 'location-1',
    })
    decryptSecretMock.mockReturnValue('plain-access-token')
    callSquareApiMock.mockImplementation(async (path: string) => {
      if (path === '/v2/orders') return { order: { id: 'order-1' } }
      if (path === '/v2/invoices') return { invoice: { id: 'draft-invoice-1' } }
      if (path === '/v2/invoices/draft-invoice-1/publish') {
        return { invoice: { id: 'published-invoice-1', public_url: 'https://squareup.com/pay/published-invoice-1' } }
      }
      throw new Error(`Unexpected Square API path in test double: ${path}`)
    })
  })

  it('createInvoice throws when Square is not connected for the company', async () => {
    getStoredSquareConnectionMock.mockReturnValue(null)

    await expect(provider.createInvoice({ ...createInvoiceInput, company: connectedCompany() })).rejects.toThrow(
      'Square is not connected for this company',
    )
  })

  it('throws when the access token is missing', async () => {
    getStoredSquareConnectionMock.mockReturnValue({ accessTokenEncrypted: undefined, locationId: 'location-1' })

    await expect(provider.createInvoice({ ...createInvoiceInput, company: connectedCompany() })).rejects.toThrow(
      'Square access token is missing for this company',
    )
  })

  it('throws when the location id is missing', async () => {
    getStoredSquareConnectionMock.mockReturnValue({ accessTokenEncrypted: 'enc', locationId: undefined })

    await expect(provider.createInvoice({ ...createInvoiceInput, company: connectedCompany() })).rejects.toThrow(
      'Square location is missing for this company',
    )
  })

  it('creates a Square order, invoice, and publishes it, in order, with per-call idempotency keys, and writes the invoices row', async () => {
    const result = await provider.createInvoice({ ...createInvoiceInput, company: connectedCompany() })

    expect(callSquareApiMock).toHaveBeenCalledTimes(3)
    const [orderCall, invoiceCall, publishCall] = callSquareApiMock.mock.calls

    expect(orderCall[0]).toBe('/v2/orders')
    expect(JSON.parse(orderCall[1].body as string).idempotency_key).toBe('swiftdispatch-order-job-1')

    expect(invoiceCall[0]).toBe('/v2/invoices')
    expect(JSON.parse(invoiceCall[1].body as string).idempotency_key).toBe('swiftdispatch-invoice-job-1')
    expect(JSON.parse(invoiceCall[1].body as string).invoice.order_id).toBe('order-1')

    expect(publishCall[0]).toBe('/v2/invoices/draft-invoice-1/publish')
    expect(JSON.parse(publishCall[1].body as string).idempotency_key).toBe('swiftdispatch-invoice-publish-job-1')

    expect(result).toEqual({
      invoiceId: 'published-invoice-1',
      invoiceUrl: 'https://squareup.com/pay/published-invoice-1',
      totalAmount: 100,
    })
    expect(db.invoices).toHaveLength(1)
    expect(db.invoices[0]).toMatchObject({
      job_id: 'job-1',
      company_id: 'company-1',
      external_invoice_id: 'published-invoice-1',
      invoice_url: 'https://squareup.com/pay/published-invoice-1',
      total_amount: 100,
      status: 'pending',
    })
  })

  it('falls back to a Date.now()-based invoice number when the nextval RPC returns no value', async () => {
    fakeOpts.seqValue = null

    await provider.createInvoice({ ...createInvoiceInput, company: connectedCompany() })

    expect(db.invoices[0].invoice_number).toMatch(/^INV-\d{4}-\d+$/)
  })

  it('throws and leaves no invoices row when order creation fails', async () => {
    callSquareApiMock.mockRejectedValueOnce(new Error('Square order creation failed'))

    await expect(provider.createInvoice({ ...createInvoiceInput, company: connectedCompany() })).rejects.toThrow(
      'Square order creation failed',
    )

    expect(callSquareApiMock).toHaveBeenCalledTimes(1)
    expect(db.invoices).toHaveLength(0)
  })

  it('throws and leaves no invoices row when invoice creation fails', async () => {
    callSquareApiMock.mockImplementationOnce(async () => ({ order: { id: 'order-1' } }))
    callSquareApiMock.mockRejectedValueOnce(new Error('Square invoice creation failed'))

    await expect(provider.createInvoice({ ...createInvoiceInput, company: connectedCompany() })).rejects.toThrow(
      'Square invoice creation failed',
    )

    expect(callSquareApiMock).toHaveBeenCalledTimes(2)
    expect(db.invoices).toHaveLength(0)
  })

  it('throws and leaves no invoices row when publish fails', async () => {
    callSquareApiMock.mockImplementationOnce(async () => ({ order: { id: 'order-1' } }))
    callSquareApiMock.mockImplementationOnce(async () => ({ invoice: { id: 'draft-invoice-1' } }))
    callSquareApiMock.mockRejectedValueOnce(new Error('Square publish failed'))

    await expect(provider.createInvoice({ ...createInvoiceInput, company: connectedCompany() })).rejects.toThrow(
      'Square publish failed',
    )

    expect(callSquareApiMock).toHaveBeenCalledTimes(3)
    expect(db.invoices).toHaveLength(0)
  })

  it('returns pending status when invoice is not found', async () => {
    await expect(provider.getPaymentStatus('missing')).resolves.toEqual({ status: 'pending' })
  })

  it('finds an invoice by its own id or by external_invoice_id', async () => {
    db.invoices.push({ id: 'inv-1', external_invoice_id: 'sq-ext-1', status: 'paid', paid_at: '2026-03-01T00:00:00.000Z' })

    expect((await provider.getPaymentStatus('inv-1')).status).toBe('paid')
    expect((await provider.getPaymentStatus('sq-ext-1')).status).toBe('paid')
  })
})
