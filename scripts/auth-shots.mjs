// Log in as each seeded role and screenshot + dump HTML of their key pages.
// Usage: node scripts/auth-shots.mjs
import { chromium } from 'playwright'
import { writeFileSync } from 'fs'

const base = process.env.LL_BASE ?? 'http://localhost:5180'
const PW = 'lamb1234'

const roles = [
  {
    name: 'family',
    email: 'family@littlelamb.test',
    toggle: 'I am a Family',
    routes: [['/family', 'family-dash'], ['/family/calendar', 'family-cal'], ['/family/billing', 'family-bill']],
  },
  {
    name: 'nanny',
    email: 'nanny@littlelamb.test',
    toggle: 'I am a Nanny',
    routes: [['/nanny', 'nanny-dash'], ['/nanny/calendar', 'nanny-cal'], ['/nanny/profile', 'nanny-prof']],
  },
  {
    name: 'admin',
    email: 'admin@littlelamb.test',
    toggle: null,
    routes: [['/admin', 'admin-dash'], ['/admin/families', 'admin-people'], ['/admin/billing', 'admin-bill'], ['/admin/analytics', 'admin-analytics']],
  },
]

const browser = await chromium.launch()

for (const role of roles) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 })
  const page = await ctx.newPage()
  await page.goto(base + '/login', { waitUntil: 'networkidle' })

  // role toggle if present
  if (role.toggle) {
    const t = page.getByText(role.toggle, { exact: false }).first()
    if (await t.count()) await t.click().catch(() => {})
  }
  await page.getByLabel(/email/i).first().fill(role.email).catch(async () => {
    await page.locator('input[type="email"]').first().fill(role.email)
  })
  await page.locator('input[type="password"]').first().fill(PW)
  await page.locator('button[type="submit"], button:has-text("Log in"), button:has-text("Sign in")').first().click()
  await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 15000 }).catch(() => {})
  await page.waitForTimeout(1500)

  for (const [route, label] of role.routes) {
    await page.goto(base + route, { waitUntil: 'networkidle' }).catch(() => {})
    await page.evaluate(() => document.fonts?.ready)
    await page.mouse.move(0, 0)
    await page.waitForTimeout(1200)
    await page.screenshot({ path: `/tmp/ll-${label}.png`, fullPage: true })
    writeFileSync(`/tmp/ll-${label}.html`, await page.content())
    console.log('shot+html', role.name, route, '->', label)
  }
  await ctx.close()
}
await browser.close()
console.log('done')
