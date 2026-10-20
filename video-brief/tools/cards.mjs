// Renders the rough cut's placeholder cards (black, white text, brand fonts via Google Fonts)
// to video-brief/rough-cut-cards/*.png at 1920x1080. Each card stands in for an AI shot or a
// designed card that ChatGPT will write prompts for — the small label says which.
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const OUT = new URL('../rough-cut-cards/', import.meta.url).pathname
mkdirSync(OUT, { recursive: true })

export const CARDS = {
  'AI-B1': { title: 'Five o’clock. The sitter just cancelled.', sub: 'AI shot · warm kitchen at dusk, parent reads “So sorry, can’t make it tonight”' },
  'AI-B2': { title: '“Anyone know a sitter??”', sub: 'AI shot · phone with a long group-text thread scrolling' },
  'TITLE-1': { title: 'Built for a community', sub: 'Santa Barbara church families · Westmont faculty · Westmont students & church nannies' },
  ROADMAP: {
    title: 'Roadmap',
    rows: [
      ['Now', 'Waitlist live · beta with select families & nannies'],
      ['January 2027', 'Public launch · emails, calendar invites & payments switch on'],
      ['Next', 'Week view · drag-to-book · one-tap rebooking · mobile app'],
    ],
  },
  OKR: {
    title: 'First-semester goals',
    rows: [
      ['40 + 10', 'vetted nannies and founding families'],
      ['< 2 hrs', 'to cover most last-minute requests'],
      ['4.8 ★', 'average private review rating'],
    ],
  },
  TEAM: {
    title: 'Lucy Behringer & David Melesse',
    sub: 'Co-founders · Westmont seniors · Lucy: operations · David: platform',
    note: 'Card · real photos of Lucy and David go here',
  },
  'AI-B5': { title: 'Christ-centered. Community-rooted.', sub: 'AI shot · nanny and child drawing with chalk, golden hour · 10% of revenue to local kids’ nonprofits' },
  OUTRO: { title: 'Little Lamb Nannies', sub: 'littlelambnannies.com · Opening January 2027 · Santa Barbara' },
}

const html = (c) => `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Caveat:wght@700&family=DM+Sans:wght@400;500&family=DM+Mono:wght@500&display=swap" rel="stylesheet">
<style>
  html,body{margin:0;width:1920px;height:1080px;background:#000;color:#fff;font-family:'DM Sans',sans-serif}
  .wrap{height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:36px;padding:0 160px;box-sizing:border-box;text-align:center}
  h1{font-family:'Caveat',cursive;font-weight:700;font-size:118px;line-height:1.05;margin:0}
  p{font-size:38px;color:#cfcfcf;margin:0;max-width:1400px;line-height:1.35}
  .note{font-family:'DM Mono',monospace;font-size:26px;color:#8a8a8a;letter-spacing:.04em}
  table{border-collapse:collapse;font-size:44px;text-align:left}
  td{padding:18px 28px;vertical-align:baseline}
  td:first-child{font-family:'DM Mono',monospace;color:#fff;white-space:nowrap}
  td:last-child{color:#d6d6d6}
</style></head><body><div class="wrap">
<h1>${c.title}</h1>
${c.sub ? `<p>${c.sub}</p>` : ''}
${c.rows ? `<table>${c.rows.map(([a, b]) => `<tr><td>${a}</td><td>${b}</td></tr>`).join('')}</table>` : ''}
${c.note ? `<div class="note">${c.note}</div>` : ''}
</div></body></html>`

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
for (const [id, c] of Object.entries(CARDS)) {
  await page.setContent(html(c), { waitUntil: 'networkidle' })
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path: OUT + id + '.png' })
  console.log('card', id)
}
await browser.close()
