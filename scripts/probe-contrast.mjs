// Print axe color-contrast failures WITH measured fg/bg/ratio. Usage: node probe-contrast.mjs <html>
import { chromium } from 'playwright'
import { readFileSync } from 'fs'

const file = process.argv[2]
const html = readFileSync(file, 'utf8')
const browser = await chromium.launch()
const page = await browser.newPage()
await page.setContent(html, { waitUntil: 'networkidle' })
// inject axe from CDN (no local copy)
await page.addScriptTag({ url: 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.10.2/axe.min.js' })
const res = await page.evaluate(async () => {
  // @ts-expect-error — axe is injected at runtime via addScriptTag above, so it is not
  // on the window type. @ts-ignore would silently do nothing if that ever stopped erroring.
  const r = await window.axe.run(document, { runOnly: ['color-contrast'] })
  return r.violations.flatMap((v) => v.nodes.map((n) => ({ html: n.html.slice(0, 90), msg: n.any?.[0]?.message ?? '' })))
})
for (const n of res) console.log(n.msg, '\n   ', n.html, '\n')
console.log('TOTAL', res.length)
await browser.close()
