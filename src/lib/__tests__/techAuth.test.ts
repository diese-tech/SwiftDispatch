import { describe, it, expect } from 'vitest'
import { generateTechHandle, generatePin, techEmail } from '../techAuth'

describe('generateTechHandle', () => {
  it('standard case: first 3 of first + first 6 of last', () => {
    // 'Mia'(3) + 'Torres'.slice(0,6)='torres'(6) = 'miatorres'
    expect(generateTechHandle('Mia', 'Torres')).toBe('miatorres')
  })

  it('preferredLast override uses preferredLast instead of lastName', () => {
    // 'Sam'(3) + 'Rivera'.slice(0,6)='rivera'(6) = 'samrivera'
    expect(generateTechHandle('Sam', 'Johnson-Rivera', 'Rivera')).toBe('samrivera')
  })

  it('uses preferredLast when provided', () => {
    // 'Joh'(3) + 'Jones'.slice(0,6)='jones'(5) = 'johjones'
    expect(generateTechHandle('John', 'Smith', 'Jones')).toBe('johjones')
  })

  it('slices firstName to 3 chars', () => {
    const handle = generateTechHandle('Alexander', 'Lee')
    expect(handle.slice(0, 3)).toBe('ale')
  })

  it('slices lastName to 6 chars max', () => {
    // 'Bob'(3) + 'Thornton'.slice(0,6)='thornto'... wait: t-h-o-r-n-t = 'thornto'? no
    // 'Thornton'.slice(0,6) = 'Thornton'.substring(0,6) = 'Thornt'
    const handle = generateTechHandle('Bob', 'Thornton')
    expect(handle).toBe('bobthornt')
    expect(handle.length).toBeLessThanOrEqual(9)
  })

  it('handles long last name correctly — max 9 chars total', () => {
    // 'Max'(3) + 'Washington'.slice(0,6)='washin'(6) = 'maxwashin'
    const handle = generateTechHandle('Max', 'Washington')
    expect(handle).toBe('maxwashin')
    expect(handle.length).toBeLessThanOrEqual(9)
  })

  it('lowercases both parts', () => {
    // 'MIK'(3) + 'JONES'.slice(0,6)='jones'(5) = 'mikjones'
    expect(generateTechHandle('MIKE', 'JONES')).toBe('mikjones')
  })

  it('preferredLast with long name sliced to 6', () => {
    // 'Ana'(3) + 'Ramirez-Ortiz'.slice(0,6)='ramire'(6) = 'anaramire'
    const handle = generateTechHandle('Ana', 'Smith', 'Ramirez-Ortiz')
    expect(handle).toBe('anaramire')
    expect(handle.length).toBeLessThanOrEqual(9)
  })
})

describe('generatePin', () => {
  it('returns exactly 4 digits', () => {
    for (let i = 0; i < 20; i++) {
      const pin = generatePin()
      expect(pin).toMatch(/^\d{4}$/)
    }
  })

  it('is always in range 1000-9999', () => {
    for (let i = 0; i < 20; i++) {
      const pin = parseInt(generatePin(), 10)
      expect(pin).toBeGreaterThanOrEqual(1000)
      expect(pin).toBeLessThanOrEqual(9999)
    }
  })
})

describe('techEmail', () => {
  it('returns correct format', () => {
    expect(techEmail('miatorr')).toBe('miatorr@internal.swiftdispatch.app')
  })

  it('preserves handle as-is', () => {
    expect(techEmail('bobthor2')).toBe('bobthor2@internal.swiftdispatch.app')
  })
})
