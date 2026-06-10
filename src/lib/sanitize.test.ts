import { describe, it, expect } from 'vitest'
import {
  cleanText,
  cleanLine,
  isValidEmail,
  cleanPhone,
  passwordError,
  normalizeEmail,
} from './sanitize'

describe('cleanText', () => {
  it('strips control characters but keeps newlines and tabs', () => {
    expect(cleanText('hi\x00\x07there')).toBe('hithere')
    expect(cleanText('line1\nline2')).toBe('line1\nline2')
  })
  it('enforces max length', () => {
    expect(cleanText('a'.repeat(50), 10)).toHaveLength(10)
  })
  it('returns empty string for non-strings', () => {
    expect(cleanText(null)).toBe('')
    expect(cleanText(42)).toBe('')
  })
})

describe('cleanLine', () => {
  it('collapses whitespace and removes newlines', () => {
    expect(cleanLine('a  b\nc')).toBe('a b c')
  })
})

describe('isValidEmail', () => {
  it('accepts valid and rejects invalid', () => {
    expect(isValidEmail('a@b.co')).toBe(true)
    expect(isValidEmail('nope')).toBe(false)
    expect(isValidEmail('a@b')).toBe(false)
  })
})

describe('normalizeEmail', () => {
  it('lowercases and trims', () => {
    expect(normalizeEmail('  Foo@Bar.COM ')).toBe('foo@bar.com')
  })
})

describe('cleanPhone', () => {
  it('keeps phone-safe characters only', () => {
    expect(cleanPhone('+1 (805) 555-1234 ext')).toBe('+1 (805) 555-1234')
  })
})

describe('passwordError', () => {
  it('requires length and complexity', () => {
    expect(passwordError('short1')).toMatch(/8 characters/)
    expect(passwordError('allletters')).toMatch(/letter and one number/)
    expect(passwordError('valid1234')).toBeNull()
  })
})
