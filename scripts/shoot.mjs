// Screenshot a running dev-server route. Usage: node scripts/shoot.mjs <path> <out> [width]
// Renders against http://localhost:5180, waits for fonts + network idle, full-page PNG.
import { chromium } from 'playwright'

const route = process.argv[2] ?? '/'
const out = process.argv[3] ?? 'shot.png'
const width = Number(process.argv[4] ?? 1280)
const base = process.env.LL_BASE ?? 'http://localhost:5180'

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: 2 })
await page.goto(base + route, { waitUntil: 'networkidle', timeout: 30000 })
await page.evaluate(() => document.fonts?.ready)
// park pointer off-canvas, settle entrance springs
await page.mouse.move(0, 0)
await page.waitForTimeout(1200)
await page.screenshot({ path: out, fullPage: true })
await browser.close()
console.log('shot ->', out, `(${width}px)`)
