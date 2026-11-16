import { describe, it, expect, afterEach, vi } from 'vitest'
import { appBase, applyUrl, loginUrl } from './appUrl'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('landing app URLs', () => {
  it('defaults to the live app host when VITE_APP_URL is unset', () => {
    vi.stubEnv('VITE_APP_URL', '')
    expect(appBase()).toBe('https://littlelamb-sb-staging-app.web.app')
  })

  it('uses VITE_APP_URL when provided, stripping a trailing slash', () => {
    vi.stubEnv('VITE_APP_URL', 'https://littlelambnannies.com/app/')
    expect(appBase()).toBe('https://littlelambnannies.com/app')
  })

  it('builds a role-scoped apply URL a family lands on', () => {
    vi.stubEnv('VITE_APP_URL', 'https://app.example.com')
    expect(applyUrl('family')).toBe('https://app.example.com/apply?role=family')
    expect(applyUrl('nanny')).toBe('https://app.example.com/apply?role=nanny')
  })

  it('builds a login URL for returning members', () => {
    vi.stubEnv('VITE_APP_URL', 'https://app.example.com')
    expect(loginUrl()).toBe('https://app.example.com/login')
  })
})
