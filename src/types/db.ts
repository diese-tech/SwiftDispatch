// Legacy status type kept for backward compat with existing components
export type LegacyJobStatus = 'New' | 'Assigned' | 'En Route' | 'Completed'

// New snake_case statuses used throughout the new state machine
export type JobStatus =
  | 'new'
  | 'assigned'
  | 'en_route'
  | 'in_progress'
  | 'quote_pending'
  | 'completed'
  | 'cancelled'
  | 'no_access'
  | LegacyJobStatus  // backward compat

export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'declined'

export type CloseStatus =
  | 'not_contacted'
  | 'contacted'
  | 'demo_done'
  | 'interested'
  | 'closed_won'
  | 'closed_lost'

export type SmsConsentType = 'intake_form' | 'verbal_logged' | 'none'

export type Company = {
  id: string
  name: string
  email: string | null
  phone: string | null
  close_status: CloseStatus
  demo_mode_enabled: boolean
  slug: string | null
  timezone: string
  sms_sender_name: string | null
  payment_provider: 'manual' | 'stripe' | 'square'
  payment_config: Record<string, unknown>
  created_at: string
}

export type AppUser = {
  id: string
  email: string
  company_id: string
  role: string
}

export type Technician = {
  id: string
  name: string
  phone: string | null
  company_id: string
  handle: string | null
  auth_user_id: string | null
  preferred_last: string | null
  availability_status: 'available' | 'on_job' | 'offline'
  current_job_id: string | null
}

export type Job = {
  id: string
  customer_name: string
  phone: string
  address: string
  issue: string
  problem_description: string | null
  status: JobStatus
  urgency: 'emergency' | 'same_day' | 'scheduled'
  technician_id: string | null
  customer_id: string | null
  company_id: string
  source: 'manual' | 'intake' | 'call'
  sms_consent_type: SmsConsentType
  created_at: string
  assigned_at: string | null
  en_route_at: string | null
  arrived_at: string | null
  completed_at: string | null
  cancelled_at: string | null
  cancellation_reason: string | null
  technician_assigned_at: string | null  // legacy column
  is_demo: boolean
}

export type Customer = {
  id: string
  company_id: string
  name: string
  phone: string
  email: string | null
  sms_consent_type: SmsConsentType
  created_at: string
}

export type Quote = {
  id: string
  job_id: string
  total: number
  total_amount: number
  status: QuoteStatus
  estimated_duration_minutes: number
  created_at: string
  quote_sent_at: string | null
  accepted_at: string | null
  rejected_at: string | null
  declined_at: string | null
  decline_reason: string | null
  is_demo: boolean
}

export type QuoteLineItem = {
  id: string
  quote_id: string
  name: string
  price: number
  quantity: number
  description?: string
  unit_price?: number
  qty?: number
  unit?: string
  optional?: boolean
}

export type StatusEvent = {
  id: string
  job_id: string
  from_status: string | null
  to_status: string
  actor_id: string | null
  actor_role: 'dispatcher' | 'admin' | 'technician' | 'customer' | 'system'
  note: string | null
  created_at: string
}

export type QuoteTemplate = {
  id: string
  company_id: string
  name: string
  line_items: Array<{
    description: string
    unit_price: number
    qty: number
    unit?: string
    optional: boolean
  }>
  estimated_duration_minutes: number
  is_active: boolean
  created_at: string
}

export type Invoice = {
  id: string
  job_id: string
  company_id: string
  invoice_number: string
  customer_name: string
  customer_phone: string
  customer_email: string | null
  total_amount: number
  status: 'pending' | 'paid' | 'void'
  external_invoice_id: string | null
  invoice_url: string | null
  paid_at: string | null
  created_at: string
}

// Composite types
export type QuoteWithLineItems = Quote & {
  quote_line_items: QuoteLineItem[]
}

export type JobWithTechnician = Job & {
  technicians?: Pick<Technician, 'id' | 'name' | 'phone'> | null
}

export type QuoteWithItems = Quote & {
  quote_line_items: QuoteLineItem[]
  jobs: Pick<Job, 'id' | 'customer_name' | 'phone' | 'address' | 'issue'> | null
}
