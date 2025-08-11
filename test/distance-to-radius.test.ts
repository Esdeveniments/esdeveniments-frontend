import { describe, it, expect } from 'vitest'
import { distanceToRadius } from '../types/event'

describe('distanceToRadius', () => {
  it('returns undefined when distance equals default', () => {
    expect(distanceToRadius(50)).toBeUndefined()
  })
  it('returns numeric distance when not default', () => {
    expect(distanceToRadius(25)).toBe(25)
  })
  it('parses string numbers', () => {
    expect(distanceToRadius('30')).toBe(30)
  })
})