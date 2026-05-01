export type JobStatus =
  | 'new'
  | 'assigned'
  | 'en_route'
  | 'in_progress'
  | 'quote_pending'
  | 'completed'
  | 'cancelled'
  | 'no_access'

export const VALID_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  new:           ['assigned', 'cancelled'],
  assigned:      ['en_route', 'cancelled'],
  en_route:      ['in_progress', 'no_access', 'cancelled'],
  in_progress:   ['quote_pending', 'cancelled'],
  quote_pending: ['completed', 'in_progress'],
  no_access:     ['new', 'cancelled'],
  completed:     [],
  cancelled:     [],
}

export function isValidTransition(from: JobStatus, to: JobStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false
}

export function assertValidTransition(from: JobStatus, to: JobStatus): void {
  if (!isValidTransition(from, to)) {
    throw new TransitionError(from, to)
  }
}

export class TransitionError extends Error {
  constructor(from: JobStatus, to: JobStatus) {
    super(
      `Invalid transition: ${from} → ${to}. Allowed from ${from}: ${VALID_TRANSITIONS[from].join(', ') || 'none'}`
    )
    this.name = 'TransitionError'
  }
}
