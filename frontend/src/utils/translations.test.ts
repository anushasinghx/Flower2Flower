import { describe, expect, it } from 'vitest'
import { translations } from './translations'

const entries = Object.entries(translations)
const placeholders = (text: string) => (text.match(/\{\w+\}/g) ?? []).sort()

describe('hindi translations', () => {
  it('has translations', () => {
    expect(entries.length).toBeGreaterThan(100)
  })

  it('has no empty values', () => {
    expect(entries.filter(([, value]) => !value.trim()).map(([key]) => key)).toEqual([])
  })

  it('keeps every placeholder from the english text', () => {
    const broken = entries.filter(([key, value]) => placeholders(key).join() !== placeholders(value).join()).map(([key]) => key)
    expect(broken).toEqual([])
  })

  it('uses no dashes between words in visible text', () => {
    const dashed = entries.filter(([key, value]) => /\s[-–—]\s|[–—]/.test(key) || /\s[-–—]\s|[–—]/.test(value)).map(([key]) => key)
    expect(dashed).toEqual([])
  })

  it('covers the main navigation labels', () => {
    for (const key of ['Home', 'History', 'Shop', 'Profile', 'Dashboard', 'Send OTP']) {
      expect(translations[key], key).toBeTruthy()
    }
  })
})
