import { describe, expect, it } from 'vitest'
import { formatKg, purityChecks, timeOf } from './helpers'

describe('operator helpers', () => {
  it('formats weight with up to two decimals', () => {
    expect(formatKg(2)).toBe('2 kg')
    expect(formatKg(1.256)).toBe('1.26 kg')
    expect(formatKg(1234.5)).toBe('1,234.5 kg')
  })

  it('formats time as 24 hour clock', () => {
    const at = new Date(2026, 10, 24, 14, 5).toISOString()
    expect(timeOf(at)).toBe('14:05')
  })

  it('lists the three purity checks', () => {
    expect(purityChecks).toHaveLength(3)
    expect(purityChecks).toContain('No plastic, metal or cloth')
  })
})
