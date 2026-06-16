// Capture rendered HTML for a list of routes. Usage: node scripts/capture.mjs <route:name> ...
import { chromium } from 'playwright'
import { writeFileSync } from 'fs'

const base = process.env.LL_BASE ?? 'http://localhost:5180'
const pairs = process.argv.slice(2).map((s) => {
  const i = s.lastIndexOf(':')
  return { route: s.slice(0, i), name: s.slice(i + 1) }
})

const browser = await chromium.launch()
for (const { route, name } of pairs) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  await page.goto(base + route, { waitUntil: 'networkidle', timeout: 30000 })
  await page.evaluate(() => document.fonts?.ready)
  writeFileSync(`/tmp/ll-${name}.html`, await page.content())
  await page.close()
  console.log('captured', route, '->', `/tmp/ll-${name}.html`)
}
await browser.close()
