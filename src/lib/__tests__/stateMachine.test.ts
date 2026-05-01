import { describe, it, expect } from 'vitest'
import {
  isValidTransition,
  assertValidTransition,
  TransitionError,
  VALID_TRANSITIONS,
  type JobStatus,
} from '../stateMachine'

describe('isValidTransition — valid transitions', () => {
  const cases: [JobStatus, JobStatus][] = [
    ['new', 'assigned'],
    ['new', 'cancelled'],
    ['assigned', 'en_route'],
    ['assigned', 'cancelled'],
    ['en_route', 'in_progress'],
    ['en_route', 'no_access'],
    ['en_route', 'cancelled'],
    ['in_progress', 'quote_pending'],
    ['in_progress', 'cancelled'],
    ['quote_pending', 'completed'],
    ['quote_pending', 'in_progress'],
    ['no_access', 'new'],
    ['no_access', 'cancelled'],
  ]

  cases.forEach(([from, to]) => {
    it(`${from} → ${to}`, () => {
      expect(isValidTransition(from, to)).toBe(true)
    })
  })
})

describe('isValidTransition — invalid skip transitions', () => {
  const cases: [JobStatus, JobStatus][] = [
    ['new', 'completed'],
    ['new', 'in_progress'],
    ['new', 'en_route'],
    ['new', 'quote_pending'],
    ['assigned', 'in_progress'],
    ['assigned', 'completed'],
    ['en_route', 'completed'],
    ['en_route', 'assigned'],
    ['in_progress', 'assigned'],
    ['in_progress', 'new'],
  ]

  cases.forEach(([from, to]) => {
    it(`${from} → ${to} returns false`, () => {
      expect(isValidTransition(from, to)).toBe(false)
    })
  })
})

describe('isValidTransition — terminal states', () => {
  const terminalStates: JobStatus[] = ['completed', 'cancelled']
  const allStatuses = Object.keys(VALID_TRANSITIONS) as JobStatus[]

  terminalStates.forEach((terminal) => {
    allStatuses.forEach((to) => {
      it(`${terminal} → ${to} returns false`, () => {
        expect(isValidTransition(terminal, to)).toBe(false)
      })
    })
  })
})

describe('assertValidTransition', () => {
  it('does not throw on valid transition', () => {
    expect(() => assertValidTransition('new', 'assigned')).not.toThrow()
  })

  it('throws TransitionError on invalid transition', () => {
    expect(() => assertValidTransition('new', 'completed')).toThrow(TransitionError)
  })

  it('throws TransitionError from terminal completed', () => {
    expect(() => assertValidTransition('completed', 'new')).toThrow(TransitionError)
  })

  it('throws TransitionError from terminal cancelled', () => {
    expect(() => assertValidTransition('cancelled', 'new')).toThrow(TransitionError)
  })
})

describe('TransitionError message format', () => {
  it('includes both from and to states', () => {
    const err = new TransitionError('new', 'completed')
    expect(err.message).toContain('new')
    expect(err.message).toContain('completed')
  })

  it('includes allowed transitions from state', () => {
    const err = new TransitionError('new', 'completed')
    expect(err.message).toContain('assigned')
    expect(err.message).toContain('cancelled')
  })

  it('says none for terminal states', () => {
    const err = new TransitionError('completed', 'new')
    expect(err.message).toContain('none')
  })

  it('has name TransitionError', () => {
    const err = new TransitionError('new', 'in_progress')
    expect(err.name).toBe('TransitionError')
  })
})
