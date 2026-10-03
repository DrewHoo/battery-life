// GSMArena battery test tables -> data/rows/bulk/gsmarena-battery.json
//
// v1 (battery-test.php3, 2012–2023): web page reload every 10 s over Wi-Fi at
// 200 nits. v2 (battery-test-v2.php3, Nov 2023 on): modern pages, scroll every
// 3 s, Wi-Fi, 200 nits. Rows key on the GSMArena device page (`gsmarenaPage`);
// build-payload joins them through the GSMArena URLs the spec rows cite.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { fetchPage } from '../lib/pages.mjs'

const TABLES = [
  { url: 'https://www.gsmarena.com/battery-test.php3', protocol: 'gsmarena-v1', webCol: 3 },
  { url: 'https://www.gsmarena.com/battery-test-v2.php3', protocol: 'gsmarena-v2', webCol: 3 },
]
const cell = (s) => s.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim()
const hours = (s) => {
  const m = s.match(/^(\d+):(\d{2})h$/)
  return m ? +(+m[1] + +m[2] / 60).toFixed(2) : null
}

const rows = []
for (const t of TABLES) {
  const r = await fetchPage(t.url)
  if (r.status !== 200) throw new Error(`${t.url}: ${r.error}`)
  const html = readFileSync(r.raw, 'utf8')
  for (const m of html.matchAll(/<tr><td class="lalign"><a href="([^"]+)">[\s\S]*?<\/tr>/g)) {
    const cells = [...m[0].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((c) => cell(c[1]))
    const web = hours(cells[t.webCol] ?? '')
    if (web == null) continue
    rows.push({
      gsmarenaPage: m[1], phone: cells[0], field: 'runtime_h', value: web, raw: cells[t.webCol],
      outlet: 'gsmarena', protocol: t.protocol, brightnessNits: 200, network: 'wifi', testDate: null,
      source: 'gsmarena-battery', url: t.url, quote: cells.join(' '), retrieved: r.fetched.slice(0, 10),
    })
  }
}

mkdirSync('data/rows/bulk', { recursive: true })
writeFileSync('data/rows/bulk/gsmarena-battery.json', JSON.stringify({ source: 'gsmarena-battery', rows }, null, 1))
console.log(`${rows.length} rows: ${rows.filter((r) => r.protocol === 'gsmarena-v1').length} v1, ${rows.filter((r) => r.protocol === 'gsmarena-v2').length} v2`)
