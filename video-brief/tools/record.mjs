// Records the launch-video clips from the local emulator demo with Playwright.
//   node video-brief/tools/record.mjs            # all clips
//   node video-brief/tools/record.mjs 10 12      # only clips whose id starts with these
// Desktop: viewport 1920x1080, deviceScaleFactor 1, recordVideo 1920x1080 → true 1080p.
// Each clip is trimmed later (see trim.json written alongside) so loading frames never show.
import { chromium, devices } from 'playwright'
import { mkdirSync, writeFileSync, renameSync, existsSync, readFileSync } from 'node:fs'

const BASE = 'http://localhost:5180'
const ROOT = new URL('../', import.meta.url).pathname
const RAW = ROOT + 'clips/raw/'
const AUTH = ROOT + 'tools/.auth/'
mkdirSync(RAW, { recursive: true })
mkdirSync(AUTH, { recursive: true })
const TRIM_FILE = RAW + 'trim.json'
const trims = existsSync(TRIM_FILE) ? JSON.parse(readFileSync(TRIM_FILE, 'utf8')) : {}

const ACCOUNTS = {
  family: 'family@littlelamb.test',
  nanny: 'nanny@littlelamb.test',
  admin: 'admin@littlelamb.test',
  interview: 'interview-nanny@littlelamb.test',
}

// ---- A visible cursor (headless video has none) + click ripple, in brand ink/sage. --------
const CURSOR_JS = `
window.addEventListener('DOMContentLoaded', () => {
  const c = document.createElement('div')
  c.id = '__cursor'
  Object.assign(c.style, { position:'fixed', left:'-40px', top:'-40px', width:'22px', height:'22px',
    borderRadius:'50%', background:'rgba(143,175,138,.35)', border:'2px solid #2C2416',
    transform:'translate(-50%,-50%)', pointerEvents:'none', zIndex:2147483647,
    transition:'width .12s, height .12s, background .12s' })
  document.body.appendChild(c)
  document.addEventListener('mousemove', e => { c.style.left = e.clientX+'px'; c.style.top = e.clientY+'px' }, true)
  document.addEventListener('mousedown', () => { c.style.width='16px'; c.style.height='16px'; c.style.background='rgba(196,149,106,.6)' }, true)
  document.addEventListener('mouseup', () => { c.style.width='22px'; c.style.height='22px'; c.style.background='rgba(143,175,138,.35)' }, true)
})`

const browser = await chromium.launch()
let mouse = { x: 960, y: 540 }

async function login(role) {
  const file = AUTH + role + '.json'
  if (existsSync(file)) return file
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } })
  const page = await ctx.newPage()
  await page.goto(BASE + '/login')
  await page.getByLabel('Email').fill(ACCOUNTS[role])
  await page.getByLabel('Password').fill('lamb1234')
  await page.getByRole('button', { name: /log in|sign in/i }).first().click()
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 15000 })
  await page.waitForTimeout(1500)
  await ctx.storageState({ path: file, indexedDB: true })
  await ctx.close()
  return file
}

/** Runs one clip in a fresh recording context; records when the "action" starts for trimming. */
async function clip(name, { role, path, mobile = false, warm }, body) {
  const opts = mobile
    ? { ...devices['iPhone 14 Pro'], recordVideo: { dir: RAW, size: devices['iPhone 14 Pro'].viewport } }
    : { viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, recordVideo: { dir: RAW, size: { width: 1920, height: 1080 } } }
  if (role) opts.storageState = await login(role)
  const ctx = await browser.newContext(opts)
  await ctx.addInitScript(CURSOR_JS)
  const t0 = Date.now() // recording starts with the page, so measure trims from here
  const page = await ctx.newPage()
  await page.goto(BASE + path)
  // Not 'networkidle': Firestore holds a long-poll open, so that wait always burned its 30s timeout.
  await page.waitForLoadState('load')
  await page.waitForTimeout(1500)
  if (warm) await warm(page)
  await page.waitForTimeout(1200) // let fonts/springs settle before the usable frames begin
  mouse = mobile ? { x: -50, y: -50 } : { x: 1700, y: 900 }
  if (!mobile) await page.mouse.move(mouse.x, mouse.y)
  const start = (Date.now() - t0) / 1000
  try {
    await body(page)
  } catch (e) {
    // Close (and discard) the context, or its recorder keeps running alongside the next clip.
    await page.screenshot({ path: RAW + name + '.FAILED.png' }).catch(() => {})
    const v = page.video()
    await ctx.close()
    await v.delete().catch(() => {})
    throw e
  }
  await page.waitForTimeout(600)
  const end = (Date.now() - t0) / 1000
  const video = page.video()
  await ctx.close()
  const out = RAW + name + '.webm'
  renameSync(await video.path(), out)
  trims[name] = { start: +start.toFixed(2), end: +end.toFixed(2) }
  writeFileSync(TRIM_FILE, JSON.stringify(trims, null, 2))
  console.log(`✓ ${name}  (${(end - start).toFixed(1)}s usable)`)
}

// ---- Smooth, human-paced interaction helpers ----------------------------------------------
const pause = (page, ms) => page.waitForTimeout(ms)

async function glide(page, x, y, ms = 700) {
  const steps = Math.max(12, Math.round(ms / 16))
  const { x: x0, y: y0 } = mouse
  for (let i = 1; i <= steps; i++) {
    const t = i / steps
    const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2 // ease-in-out
    await page.mouse.move(x0 + (x - x0) * e, y0 + (y - y0) * e)
    await page.waitForTimeout(ms / steps)
  }
  mouse = { x, y }
}

async function hover(page, loc, ms) {
  // Text matchers can hit hidden duplicates (e.g. mobile nav), which stalled 30s waiting to scroll.
  loc = loc.filter({ visible: true }).first()
  await loc.scrollIntoViewIfNeeded({ timeout: 5000 })
  const b = await loc.boundingBox()
  await glide(page, b.x + b.width / 2, b.y + b.height / 2, ms)
}

async function click(page, loc, { ms = 700, after = 500 } = {}) {
  await hover(page, loc, ms)
  await pause(page, 180)
  await page.mouse.down()
  await pause(page, 90)
  await page.mouse.up()
  await pause(page, after)
}

async function type(page, loc, text, delay = 55) {
  await click(page, loc, { after: 150 })
  await loc.pressSequentially(text, { delay })
  await pause(page, 250)
}

/** Smooth scroll by `dy` px over `ms`. */
async function scroll(page, dy, ms = 1400) {
  await page.evaluate(
    ([dy, ms]) =>
      new Promise((res) => {
        const y0 = window.scrollY, t0 = performance.now()
        const step = (t) => {
          const p = Math.min(1, (t - t0) / ms)
          const e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2
          window.scrollTo(0, y0 + dy * e)
          p < 1 ? requestAnimationFrame(step) : res()
        }
        requestAnimationFrame(step)
      }),
    [dy, ms],
  )
}

async function tap(page, loc, after = 500) {
  await loc.scrollIntoViewIfNeeded()
  await loc.tap()
  await pause(page, after)
}

// ---- Date helpers (local time) ------------------------------------------------------------
const today = new Date()
const dayN = (n) => { const d = new Date(today); d.setDate(d.getDate() + n); return d }
/** Next date ≥ minDays out that falls on weekday `dow` (0=Sun). */
function nextDow(dow, minDays) {
  for (let i = minDays; i < minDays + 8; i++) if (dayN(i).getDay() === dow) return dayN(i)
}
/** The calendar day cell for a Date — a button whose first span is the day number. */
const dayCell = (page, d) =>
  page.locator('button:not([disabled])').filter({ has: page.locator(`span:text-is("${d.getDate()}")`) }).first()

// =============================================================================================
const CLIPS = {
  '01-landing-hero': () =>
    clip('01-landing-hero', { path: '/' }, async (p) => {
      await pause(p, 2200)
      await hover(p, p.getByText('Background-checked', { exact: true }).first(), 900)
      await pause(p, 700)
      await hover(p, p.getByRole('link', { name: /get started/i }).nth(1), 800)
      await pause(p, 900)
      await scroll(p, 760, 2200)
      await pause(p, 1600)
      await scroll(p, 900, 2200)
      await pause(p, 2000)
    }),

  '02-meet-the-network': () =>
    clip('02-meet-the-network', { path: '/' }, async (p) => {
      const h = p.getByText(/meet the network/i).first()
      await h.evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 120))
      await pause(p, 1500)
      await scroll(p, 500, 2400)
      await pause(p, 1500)
      await scroll(p, 700, 2400)
      await pause(p, 1800)
    }),

  '03-family-apply': () =>
    clip('03-family-apply', { path: '/apply' }, async (p) => {
      await pause(p, 1200)
      await type(p, p.getByLabel('Full name'), 'Rebecca Lindqvist')
      await type(p, p.getByLabel('Email'), 'rebecca.lindqvist@gmail.com', 35)
      await type(p, p.getByLabel('Phone'), '805-555-0119')
      await type(p, p.getByLabel('Password'), 'Lambchop2026', 45)
      await type(p, p.getByLabel('Number of children and their ages'), 'Two kids, ages 3 and 6', 45)
      await type(p, p.getByLabel(/special needs/i), 'Our youngest naps 1–3pm.', 40)
      await p.getByLabel(/how did you find us/i).scrollIntoViewIfNeeded()
      await click(p, p.getByLabel(/how did you find us/i), { after: 200 })
      await p.getByLabel(/how did you find us/i).selectOption({ index: 3 }).catch(() => {})
      await pause(p, 600)
      await click(p, p.getByRole('button', { name: /create account & apply/i }), { after: 3500 })
    }),

  '04-nanny-application-status': () =>
    clip('04-nanny-application-status', { role: 'interview', path: '/nanny/pending' }, async (p) => {
      await pause(p, 1800)
      for (const s of ['Application received', 'Under review', 'Interview scheduled']) {
        await hover(p, p.getByText(s).first(), 650)
        await pause(p, 450)
      }
      await hover(p, p.getByRole('link', { name: /book your interview slot/i }).or(p.getByRole('button', { name: /book your interview slot/i })).first(), 800)
      await pause(p, 1500)
      await hover(p, p.getByRole('link', { name: /complete your profile/i }).or(p.getByRole('button', { name: /complete your profile/i })).first(), 800)
      await pause(p, 1500)
    }),

  '05-admin-dashboard': () =>
    clip('05-admin-dashboard', { role: 'admin', path: '/admin' }, async (p) => {
      await pause(p, 2200)
      await hover(p, p.getByText('The Nakamura Family').first(), 900)
      await pause(p, 1200)
      await scroll(p, 520, 2000)
      await pause(p, 1500)
      await hover(p, p.getByRole('button', { name: 'Approve' }).first(), 900)
      await pause(p, 1500)
    }),

  '06-admin-vetting': () =>
    clip('06-admin-vetting', { role: 'admin', path: '/admin/nannies' }, async (p) => {
      await pause(p, 1500)
      const ella = p.locator('div').filter({ hasText: /^Ella Thompson/ }).first()
      void ella
      await click(p, p.getByRole('button', { name: /advance/i }).nth(1), { after: 1600 })
      await click(p, p.getByRole('button', { name: 'Badges' }).first(), { after: 1400 })
      const dlg = p.getByRole('dialog')
      const boxes = dlg.getByRole('checkbox')
      if (await boxes.count()) {
        for (let i = 0; i < Math.min(3, await boxes.count()); i++) {
          if (!(await boxes.nth(i).isChecked())) await click(p, boxes.nth(i), { ms: 450, after: 350 })
        }
      } else {
        const chips = dlg.getByRole('button').filter({ hasText: /CPR|First Aid|Background|Interviewed/ })
        for (let i = 0; i < Math.min(3, await chips.count()); i++) await click(p, chips.nth(i), { ms: 450, after: 350 })
      }
      await pause(p, 600)
      const save = dlg.getByRole('button', { name: /save/i })
      if (await save.count()) await click(p, save.first(), { after: 1000 })
      else await p.keyboard.press('Escape')
      await pause(p, 600)
      await click(p, p.getByRole('button', { name: 'Approve' }).first(), { after: 2200 })
    }),

  '07-family-dashboard': () =>
    clip('07-family-dashboard', { role: 'family', path: '/family' }, async (p) => {
      await pause(p, 2000)
      await hover(p, p.getByText('Next booking', { exact: false }).first(), 900)
      await pause(p, 1200)
      await hover(p, p.getByText('Maya Brooks').last(), 900)
      await pause(p, 1200)
      await hover(p, p.getByRole('button', { name: 'Book a nanny' }).or(p.getByRole('link', { name: 'Book a nanny' })).first(), 900)
      await pause(p, 1400)
    }),

  '08-family-browse-nannies': () =>
    clip('08-family-browse-nannies', { role: 'family', path: '/family/nannies' }, async (p) => {
      await pause(p, 1500)
      await hover(p, p.getByText('Background checked', { exact: true }).first(), 900)
      await pause(p, 1000)
      await hover(p, p.getByText('Sofia Reyes').first(), 900)
      await pause(p, 900)
      await scroll(p, 420, 1800)
      await hover(p, p.getByText('Olivia Bennett').first(), 900)
      await pause(p, 900)
      await scroll(p, 420, 1800)
      await pause(p, 1200)
    }),

  '09-nanny-profile': () =>
    clip('09-nanny-profile', { role: 'family', path: '/family/nannies' }, async (p) => {
      await pause(p, 1000)
      await click(p, p.getByRole('link', { name: /view profile/i }).or(p.getByRole('button', { name: /view profile/i })).first(), { after: 2200 })
      await hover(p, p.getByText(/CPR Certified/).first(), 900)
      await pause(p, 1200)
      await scroll(p, 450, 2000)
      await pause(p, 2000)
      await scroll(p, 450, 2000)
      await pause(p, 1500)
    }),

  '10-family-book-confirmed': () =>
    clip('10-family-book-confirmed', { role: 'family', path: '/family/calendar' }, async (p) => {
      const wed = nextDow(3, 3) // a Wednesday ≥3 days out, inside Maya's Mon–Thu 3–8pm hours
      if (wed.getMonth() !== today.getMonth()) await p.getByRole('button', { name: 'Next month' }).click()
      await pause(p, 1500)
      await click(p, dayCell(p, wed).locator('span').first(), { after: 1200 })
      const dlg = p.getByRole('dialog')
      await click(p, dlg.getByLabel('Start'), { after: 200 })
      await dlg.getByLabel('Start').fill('16:00')
      await pause(p, 300)
      await click(p, dlg.getByLabel('End'), { after: 200 })
      await dlg.getByLabel('End').fill('19:00')
      await pause(p, 400)
      await click(p, dlg.getByLabel('Nanny', { exact: true }), { after: 200 })
      const maya = await dlg.getByLabel('Nanny', { exact: true }).locator('option', { hasText: 'Maya Brooks' }).getAttribute('value')
      await dlg.getByLabel('Nanny', { exact: true }).selectOption(maya)
      await pause(p, 1200)
      await type(p, dlg.getByLabel('Notes for your nanny'), 'Olive has art class until 4:30. Dinner at 6!', 40)
      await click(p, dlg.getByText('Make this recurring'), { after: 900 })
      await click(p, dlg.getByRole('button', { name: 'Confirm booking' }), { after: 3200 })
    }),

  '11-family-last-minute': () =>
    clip('11-family-last-minute', { role: 'family', path: '/family/calendar' }, async (p) => {
      await pause(p, 1500)
      await click(p, dayCell(p, today).locator('span').first(), { after: 1200 })
      const dlg = p.getByRole('dialog')
      await click(p, dlg.getByLabel('Start'), { after: 200 })
      await dlg.getByLabel('Start').fill('18:00')
      await click(p, dlg.getByLabel('End'), { after: 200 })
      await dlg.getByLabel('End').fill('22:00')
      await pause(p, 400)
      await type(p, dlg.getByLabel('Notes for your nanny'), 'Sitter fell through — need someone tonight. Kids in bed by 8.', 38)
      await hover(p, dlg.getByText(/same-day bookings/i), 800)
      await pause(p, 1500)
      await click(p, dlg.getByRole('button', { name: 'Confirm booking' }), { after: 3500 })
    }),

  '12-nanny-job-board-claim': () =>
    clip('12-nanny-job-board-claim', { role: 'nanny', path: '/nanny/job-board' }, async (p) => {
      await pause(p, 2000)
      const first = p.getByRole('button', { name: /accept this booking/i }).first()
      await hover(p, p.getByText(/sitter fell through/i).first(), 900)
      await pause(p, 1500)
      await click(p, first, { after: 1200 })
      const confirm = p.getByRole('dialog').getByRole('button', { name: /accept|confirm|claim/i })
      if (await confirm.count()) await click(p, confirm.first(), { after: 1200 })
      await pause(p, 2500)
    }),

  '13-nanny-dashboard': () =>
    clip('13-nanny-dashboard', { role: 'nanny', path: '/nanny' }, async (p) => {
      await pause(p, 1800)
      await hover(p, p.getByText('Next booking').first(), 900)
      await pause(p, 1000)
      await hover(p, p.getByText('Job board', { exact: false }).nth(1), 900)
      await pause(p, 1200)
      await click(p, p.getByRole('link', { name: 'Calendar', exact: true }), { after: 2500 })
      await hover(p, p.getByText('The Hartley Family').first(), 900)
      await pause(p, 1500)
    }),

  '14-nanny-own-profile': () =>
    clip('14-nanny-own-profile', { role: 'nanny', path: '/nanny/profile' }, async (p) => {
      await pause(p, 1500)
      await hover(p, p.getByText('Profile completeness', { exact: false }).first(), 900)
      await pause(p, 1000)
      await scroll(p, 520, 2000)
      await hover(p, p.getByText('Verified by Little Lamb', { exact: false }).first(), 900)
      await pause(p, 1500)
      await scroll(p, 500, 2000)
      await pause(p, 1500)
    }),

  '15-family-review': () =>
    clip('15-family-review', { role: 'family', path: '/family' }, async (p) => {
      await pause(p, 1500)
      await click(p, p.getByRole('button', { name: 'Leave a review' }).first(), { after: 1000 })
      const dlg = p.getByRole('dialog')
      await click(p, dlg.getByRole('radio', { name: '5 stars' }).or(dlg.getByLabel('5 stars')).first(), { after: 500 })
      await type(p, dlg.getByLabel(/anything you'd like to share/i), 'Maya was wonderful. Theo is already asking when she can come back.', 38)
      await pause(p, 600)
      await click(p, dlg.getByRole('button', { name: 'Submit review' }), { after: 2000 })
    }),

  '16-admin-bookings': () =>
    clip('16-admin-bookings', { role: 'admin', path: '/admin/bookings' }, async (p) => {
      await pause(p, 1800)
      await scroll(p, 300, 1500)
      await pause(p, 800)
      await scroll(p, -300, 1200)
      await click(p, p.getByRole('button', { name: 'Create booking' }), { after: 1200 })
      const dlg = p.getByRole('dialog')
      await click(p, dlg.getByLabel('Family'), { after: 200 })
      await dlg.getByLabel('Family').selectOption({ index: 1 })
      await pause(p, 400)
      await click(p, dlg.getByLabel('Nanny', { exact: true }), { after: 200 })
      await dlg.getByLabel('Nanny', { exact: true }).selectOption({ index: 2 })
      await pause(p, 1500)
      await p.keyboard.press('Escape')
      await pause(p, 800)
    }),

  '17-admin-settings': () =>
    clip('17-admin-settings', { role: 'admin', path: '/admin/settings' }, async (p) => {
      await pause(p, 1800)
      await scroll(p, 300, 1500)
      await pause(p, 800)
      await scroll(p, -300, 1200)
      await click(p, p.getByRole('tab', { name: 'Policies' }).or(p.getByRole('button', { name: 'Policies' })).first(), { after: 2200 })
      await scroll(p, 300, 1500)
      await pause(p, 1200)
    }),

  '18-mobile-landing': () =>
    clip('18-mobile-landing', { path: '/', mobile: true }, async (p) => {
      await pause(p, 2200)
      for (let i = 0; i < 4; i++) {
        await scroll(p, 600, 1800)
        await pause(p, 1100)
      }
    }),

  '19-mobile-family': () =>
    clip('19-mobile-family', { role: 'family', path: '/family/nannies', mobile: true }, async (p) => {
      await pause(p, 1800)
      await scroll(p, 500, 1800)
      await pause(p, 900)
      await scroll(p, -500, 1200)
      await tap(p, p.getByRole('link', { name: /view profile/i }).or(p.getByRole('button', { name: /view profile/i })).first(), 2000)
      await scroll(p, 600, 2000)
      await pause(p, 1500)
    }),
}

const only = process.argv.slice(2)
for (const [id, run] of Object.entries(CLIPS)) {
  if (only.length && !only.some((o) => id.startsWith(o))) continue
  try {
    await run()
  } catch (e) {
    console.log(`✗ ${id}: ${e.message.split('\n')[0]}`)
  }
}
await browser.close()
