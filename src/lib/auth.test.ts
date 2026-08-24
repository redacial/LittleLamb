import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createAccount, signInWithGoogle } from './auth'

// createAccount() is the write boundary for users/{uid} — the doc an admin reads when
// deciding whether to approve someone. The application answers arrive here from the PUBLIC,
// unauthenticated /apply form, so this is the last place they can be cleaned before they
// land in the database. These tests pin that they are persisted at all (they used to be
// dropped into a sessionStorage key nothing read), and that they are sanitized and
// length-capped rather than stored raw.
//
// The caps asserted below MUST match the strMax() guards on match /users in firestore.rules.
// If the client ever allowed more than the rules do, the setDoc is rejected wholesale and
// the applicant loses the entire account, not just the overlong field.

const setDoc = vi.fn()

vi.mock('../lib/firebase', () => ({ db: {}, auth: {} }))

vi.mock('firebase/firestore', () => ({
  doc: (_db: unknown, ...path: string[]) => ({ path: path.join('/') }),
  getDoc: vi.fn(async () => ({ exists: () => false, data: () => undefined })),
  setDoc: (...args: unknown[]) => setDoc(...args),
  serverTimestamp: () => 'SERVER_TS',
}))

const createUserWithEmailAndPassword = vi.fn(async () => ({ user: { uid: 'u1', email: null, displayName: null } }))
const signInWithPopup = vi.fn(async () => ({ user: { uid: 'u1', email: 'g@example.com', displayName: 'Google User' } }))

vi.mock('firebase/auth', () => ({
  createUserWithEmailAndPassword: (...a: unknown[]) => createUserWithEmailAndPassword(...(a as [])),
  signInWithEmailAndPassword: vi.fn(),
  signInWithPopup: (...a: unknown[]) => signInWithPopup(...(a as [])),
  GoogleAuthProvider: class {},
  signOut: vi.fn(),
  updateProfile: vi.fn(async () => undefined),
}))

beforeEach(() => {
  setDoc.mockReset()
  setDoc.mockResolvedValue(undefined)
})

/** The document actually written to users/{uid} by the most recent call. */
function writtenDoc(): Record<string, unknown> {
  expect(setDoc).toHaveBeenCalled()
  return setDoc.mock.calls[setDoc.mock.calls.length - 1][1] as Record<string, unknown>
}

const base = {
  email: 'dana@example.com',
  password: 'lambs1234',
  fullName: 'Dana Whitfield',
  phone: '805-555-0142',
} as const

describe('createAccount — the family application is persisted', () => {
  it('writes neighborhood, children and notes onto the user doc', async () => {
    await createAccount({
      ...base,
      role: 'family',
      neighborhood: 'The Mesa',
      children: 'Two kids, ages 3 and 6',
      notes: 'Peanut allergy.',
    })

    expect(writtenDoc()).toMatchObject({
      neighborhood: 'The Mesa',
      children: 'Two kids, ages 3 and 6',
      notes: 'Peanut allergy.',
    })
  })
})

describe('createAccount — the nanny application is persisted', () => {
  it('writes yearsExperience and personalStatement onto the user doc', async () => {
    await createAccount({
      ...base,
      role: 'nanny',
      yearsExperience: '5',
      personalStatement: 'I have cared for toddlers for five years.',
    })

    expect(writtenDoc()).toMatchObject({
      yearsExperience: '5',
      personalStatement: 'I have cared for toddlers for five years.',
    })
  })
})

describe('createAccount — application answers are sanitized before the write', () => {
  it('strips control characters from free text', async () => {
    await createAccount({
      ...base,
      role: 'family',
      children: 'Two kids\x00\x07, ages 3 and 6',
    })

    const children = writtenDoc().children as string
    // eslint-disable-next-line no-control-regex
    expect(children).not.toMatch(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/)
    expect(children).toBe('Two kids, ages 3 and 6')
  })

  it('collapses the single-line neighborhood — no newlines reach the user doc', async () => {
    await createAccount({ ...base, role: 'family', neighborhood: 'The\nMesa' })

    const neighborhood = writtenDoc().neighborhood as string
    expect(neighborhood).not.toContain('\n')
    expect(neighborhood).toBe('The Mesa')
  })

  it('length-caps the family answers rather than storing them unbounded', async () => {
    await createAccount({
      ...base,
      role: 'family',
      neighborhood: 'N'.repeat(400),
      children: 'C'.repeat(3000),
      notes: 'X'.repeat(3000),
    })

    const written = writtenDoc()
    expect((written.neighborhood as string).length).toBe(120)
    expect((written.children as string).length).toBe(500)
    expect((written.notes as string).length).toBe(1000)
  })

  it('length-caps the nanny answers', async () => {
    await createAccount({
      ...base,
      role: 'nanny',
      yearsExperience: '9'.repeat(200),
      personalStatement: 'S'.repeat(3000),
    })

    const written = writtenDoc()
    expect((written.yearsExperience as string).length).toBe(60)
    expect((written.personalStatement as string).length).toBe(1000)
  })

  it('omits blank answers entirely instead of writing empty strings', async () => {
    await createAccount({ ...base, role: 'family', neighborhood: '', children: '   ' })

    const written = writtenDoc()
    expect('neighborhood' in written).toBe(false)
    expect('children' in written).toBe(false)
  })

  it('never writes the other role\'s fields when they were not supplied', async () => {
    await createAccount({ ...base, role: 'family', neighborhood: 'Riviera' })

    const written = writtenDoc()
    expect('yearsExperience' in written).toBe(false)
    expect('personalStatement' in written).toBe(false)
  })

  it('writes no undefined values — Firestore rejects them outright', async () => {
    await createAccount({ ...base, role: 'family', neighborhood: 'Goleta' })

    for (const [key, value] of Object.entries(writtenDoc())) {
      expect(value, `${key} must not be undefined`).not.toBeUndefined()
    }
  })
})

describe('signInWithGoogle — the application survives a Google signup too', () => {
  it('persists and sanitizes the answers on a first-time Google account', async () => {
    await signInWithGoogle('family', {
      neighborhood: 'Goleta\n',
      children: 'One, age 4',
      notes: 'X'.repeat(3000),
    })

    const written = writtenDoc()
    expect(written.neighborhood).toBe('Goleta')
    expect(written.children).toBe('One, age 4')
    expect((written.notes as string).length).toBe(1000)
  })
})
