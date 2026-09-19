// Pure quote-total math, extracted out of the route handlers that used to
// compute it inline (quotes/[id]/line-items(+[itemId]) and
// quotes/[id]/accept). No I/O, no dependencies -- same shape as
// stateMachine.ts/smsGate.ts, so the arithmetic itself is directly unit
// testable instead of only inferable through a mocked-Supabase route test.

type LineItemAmount = {
  price: number | null | undefined
  quantity: number | null | undefined
}

export function sumLineItems(items: LineItemAmount[]): number {
  return items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0)
}

// accept/route.ts's fallback chain for a quote's total at acceptance time:
// prefer the live line-items sum; if there are no line items (or they sum
// to zero), fall back to whichever of total_amount/total is already
// recorded on the quote.
export function resolveEffectiveTotal(input: {
  lineItemsTotal: number
  totalAmount: number | null | undefined
  total: number | null | undefined
}): number {
  if (input.lineItemsTotal > 0) return input.lineItemsTotal
  const totalAmount = Number(input.totalAmount ?? 0)
  if (totalAmount > 0) return totalAmount
  return Number(input.total ?? 0)
}
