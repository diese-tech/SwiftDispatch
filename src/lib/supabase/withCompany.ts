import { SupabaseClient } from '@supabase/supabase-js'

export async function getCompanyId(supabase: SupabaseClient): Promise<string> {
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('Unauthenticated')

  const { data, error } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (error || !data?.company_id) throw new Error('Company not found')
  return data.company_id
}

export async function requireRole(
  supabase: SupabaseClient,
  allowed: string[]
): Promise<{ userId: string; companyId: string; role: string }> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthenticated')

  const { data } = await supabase
    .from('users')
    .select('company_id, role')
    .eq('id', user.id)
    .single()

  if (!data) throw new Error('User not found')
  if (!allowed.includes(data.role)) throw new Error(`Role '${data.role}' not permitted`)
  if (!data.company_id) throw new Error('No company associated with this account')

  return { userId: user.id, companyId: data.company_id, role: data.role }
}
