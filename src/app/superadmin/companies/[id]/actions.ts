'use server'

import { revalidatePath } from 'next/cache'
import { requireSuperAdminProfile } from '@/lib/auth'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { generatePin, generateTechHandle, resolveUniqueHandle, techEmail } from '@/lib/techAuth'

function str(fd: FormData, key: string) {
  return String(fd.get(key) ?? '').trim()
}

export async function suspendCompanyAction(formData: FormData) {
  await requireSuperAdminProfile()
  const companyId = str(formData, 'company_id')
  if (!companyId) return

  const supabase = createSupabaseAdminClient()
  await supabase.from('companies').update({ suspended: true }).eq('id', companyId)
  revalidatePath(`/superadmin/companies/${companyId}`)
  revalidatePath('/superadmin')
}

export async function unsuspendCompanyAction(formData: FormData) {
  await requireSuperAdminProfile()
  const companyId = str(formData, 'company_id')
  if (!companyId) return

  const supabase = createSupabaseAdminClient()
  await supabase.from('companies').update({ suspended: false }).eq('id', companyId)
  revalidatePath(`/superadmin/companies/${companyId}`)
  revalidatePath('/superadmin')
}

export async function createDispatcherForCompanyAction(formData: FormData) {
  await requireSuperAdminProfile()
  const companyId = str(formData, 'company_id')
  const email = str(formData, 'email')
  const password = str(formData, 'password')
  if (!companyId || !email || !password) return

  const supabase = createSupabaseAdminClient()

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (error || !data.user) throw new Error(error?.message ?? 'Failed to create user')

  const { error: profileError } = await supabase.from('users').insert({
    id: data.user.id,
    email,
    company_id: companyId,
    role: 'dispatcher',
  })

  if (profileError) {
    await supabase.auth.admin.deleteUser(data.user.id)
    throw new Error(profileError.message)
  }

  revalidatePath(`/superadmin/companies/${companyId}`)
}

export async function createAdminForCompanyAction(formData: FormData) {
  await requireSuperAdminProfile()
  const companyId = str(formData, 'company_id')
  const email = str(formData, 'email')
  const password = str(formData, 'password')
  if (!companyId || !email || !password) return

  const supabase = createSupabaseAdminClient()

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (error || !data.user) throw new Error(error?.message ?? 'Failed to create user')

  const { error: profileError } = await supabase.from('users').insert({
    id: data.user.id,
    email,
    company_id: companyId,
    role: 'admin',
  })

  if (profileError) {
    await supabase.auth.admin.deleteUser(data.user.id)
    throw new Error(profileError.message)
  }

  revalidatePath(`/superadmin/companies/${companyId}`)
}

export async function addTechnicianToCompanyAction(formData: FormData) {
  await requireSuperAdminProfile()
  const companyId = str(formData, 'company_id')
  const name = str(formData, 'name')
  const phone = str(formData, 'phone')
  if (!companyId || !name) return

  const supabase = createSupabaseAdminClient()

  const nameParts = name.split(/\s+/).filter(Boolean)
  const firstName = nameParts[0] ?? name
  const lastName = nameParts.slice(1).join(' ') || firstName
  const baseHandle = generateTechHandle(firstName, lastName)
  const handle = await resolveUniqueHandle(baseHandle, supabase)
  const pin = generatePin()
  const syntheticEmail = techEmail(handle)
  const password = pin

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: syntheticEmail,
    password,
    email_confirm: true,
  })

  const authUserId = authData?.user?.id ?? null

  const { error } = await supabase.from('technicians').insert({
    company_id: companyId,
    name,
    phone: phone || null,
    handle,
    auth_user_id: authUserId,
    availability_status: 'available',
  })

  if (error) throw new Error(error.message)

  if (authUserId) {
    await supabase.from('users').insert({
      id: authUserId,
      email: syntheticEmail,
      company_id: companyId,
      role: 'technician',
    })
  }

  revalidatePath(`/superadmin/companies/${companyId}`)
}
