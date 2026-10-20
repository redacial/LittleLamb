// Scout pass: screenshot every route per role at 1920x1080 so we can pick shots and catch
// broken/empty/ugly screens before recording. Output: video-brief/scout/*.png
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = 'http://localhost:5180'
const OUT = new URL('../scout/', import.meta.url).pathname
mkdirSync(OUT, { recursive: true })

const ROUTES = {
  public: ['/', '/for-families', '/for-nannies', '/apply', '/login'],
  'family@littlelamb.test': ['/family', '/family/calendar', '/family/bookings', '/family/nannies', '/family/profile', '/family/policies'],
  'nanny@littlelamb.test': ['/nanny', '/nanny/calendar', '/nanny/bookings', '/nanny/job-board', '/nanny/profile'],
  'admin@littlelamb.test': ['/admin', '/admin/analytics', '/admin/nannies', '/admin/families', '/admin/bookings', '/admin/settings'],
  'pending-nanny@littlelamb.test': ['/nanny/pending'],
  'interview-nanny@littlelamb.test': ['/nanny/pending'],
  'pending-family@littlelamb.test': ['/family/pending'],
}

const browser = await chromium.launch()
for (const [who, routes] of Object.entries(ROUTES)) {
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => console.log(`[${who}] pageerror: ${e.message}`))
  if (who !== 'public') {
    await page.goto(BASE + '/login')
    await page.getByLabel('Email').fill(who)
    await page.getByLabel('Password').fill('lamb1234')
    await page.getByRole('button', { name: /log in|sign in/i }).first().click()
    await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 15000 })
  }
  for (const r of routes) {
    await page.goto(BASE + r)
    await page.waitForTimeout(2000)
    const name = `${who.split('@')[0]}${r.replace(/\//g, '_') || '_home'}.png`
    await page.screenshot({ path: OUT + name })
    console.log(name, page.url())
  }
  await ctx.close()
}
await browser.close()
