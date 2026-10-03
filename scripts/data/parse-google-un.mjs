// Google Store UN38.3 page -> data/rows/bulk/google-un.json. One capacity_wh
// row per battery. Google keys rows by battery model number, so `product` is
// the product name from the description column; build-payload joins it to the
// roster through each device's `googleName`.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { fetchPage } from '../lib/pages.mjs'

const URL = 'https://support.google.com/store/answer/9682653?hl=en'
const r = await fetchPage(URL)
if (r.status !== 200) throw new Error(`Google UN38.3 fetch failed: ${r.error}`)
const html = readFileSync(r.raw, 'utf8')
const cell = (s) => s.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim()
const trs = [...html.matchAll(/<tr[\s\S]*?<\/tr>/g)].map((m) => [...m[0].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g)].map((c) => cell(c[1])))

const rows = []
const skipped = []
for (const tr of trs) {
  if (tr.length !== 6) continue
  const [battery, desc, weight, wh] = tr
  const m = desc.match(/^Lithium ion (?:single cell |polymer )?battery (.+)$/i)
  const v = wh.match(/^([\d.]+)\s*Wh$/i)
  // Multi-battery rows (Folds) pack two batteries into one cell; out of scope.
  if (!m || !v || /Lithium ion .*Lithium ion/i.test(desc)) {
    if (/Wh/i.test(wh)) skipped.push(tr.join(' | '))
    continue
  }
  rows.push({
    batteryModel: battery, product: m[1], field: 'capacity_wh', value: +v[1], unit: 'Wh', batteryWeight: weight,
    source: 'google-un', url: URL, quote: tr.slice(0, 4).join(' '), retrieved: r.fetched.slice(0, 10),
  })
}

mkdirSync('data/rows/bulk', { recursive: true })
writeFileSync('data/rows/bulk/google-un.json', JSON.stringify({ source: 'google-un', url: URL, rows }, null, 1))
console.log(`${rows.length} Google rows: ${rows.map((r) => r.product).join(', ')}`)
if (skipped.length) console.log(`skipped ${skipped.length}:\n  ` + skipped.join('\n  '))
