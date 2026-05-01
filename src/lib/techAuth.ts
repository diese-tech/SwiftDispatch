import { SupabaseClient } from '@supabase/supabase-js'

export function generateTechHandle(
  firstName: string,
  lastName: string,
  preferredLast?: string
): string {
  const first = firstName.trim().toLowerCase().slice(0, 3)
  const last = (preferredLast ?? lastName).trim().toLowerCase().slice(0, 6)
  return `${first}${last}`
}

export function generatePin(): string {
  return Math.floor(1000 + Math.random() * 9000).toString()
}

export function techEmail(handle: string): string {
  return `${handle}@internal.swiftdispatch.app`
}

export async function resolveUniqueHandle(
  base: string,
  supabase: SupabaseClient
): Promise<string> {
  const { data } = await supabase
    .from('technicians')
    .select('handle')
    .eq('handle', base)
    .single()

  if (!data) return base

  let i = 2
  while (true) {
    const candidate = `${base}${i}`
    const { data: exists } = await supabase
      .from('technicians')
      .select('handle')
      .eq('handle', candidate)
      .single()
    if (!exists) return candidate
    i++
  }
}
