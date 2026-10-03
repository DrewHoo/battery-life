// Apple & Beats Product Information Sheet (UN38.3 transport doc) ->
// data/rows/bulk/apis.json. One capacity_wh row per Apple model number.
// Rows key on modelNumber, not device: build-payload joins them through the
// roster's model numbers. APIS descriptions are not trusted (it labels A1502,
// a 13" MacBook Pro, "MacBook Air 13-inch with Retina display").
import { mkdirSync, writeFileSync } from 'node:fs'
import { fetchPage, readText } from '../lib/pages.mjs'

const URL = 'https://chemtrec.blob.core.windows.net/criterion/APIS_BPIS_Current.pdf'
const r = await fetchPage(URL)
if (r.status !== 200) throw new Error(`APIS fetch failed: ${r.error}`)
const lines = readText(URL).split('\n').map((l) => l.trim())

// A row can wrap across lines; it ends at the UN number.
const ROW = /^(A\d{4})\s+(.*?)\s+(\d+)\s+(\d+)\s+(\d*\.\d+|\d+)\s+(\d*\.\d+|\d+)\s+([YN])\s+UN\s*(\d{4})(?:\s+[A-Z]{1,3})?$/
const rows = []
const skipped = []
let buf = null
for (const line of lines) {
  if (/^A\d{4}\b/.test(line)) {
    if (buf) skipped.push(buf)
    buf = line
  } else if (buf) buf += ' ' + line
  else continue
  if (/UN\s*\d{4}(\s+[A-Z]{1,3})?$/.test(buf)) {
    const m = buf.match(ROW)
    if (!m) skipped.push(buf)
    else {
      const [, modelNumber, description, perProduct, cells, weightKg, wh] = m
      rows.push({
        // Wh Rating is per battery; a two-battery product (a foldable) holds both.
        modelNumber, description, field: 'capacity_wh', value: +(+wh * +perProduct).toFixed(3), whPerBattery: +wh, unit: 'Wh',
        // "(after activation)" rows carry the >20 Wh rating a battery unlocks once
        // the phone is activated; the plain row for the same number is the
        // shipping rating, held at 19.79 Wh to stay under the 20 Wh air-freight line.
        activation: /after activation/i.test(description) ? 'after' : null,
        batteriesPerProduct: +perProduct, cells: +cells, batteryWeightKg: +weightKg,
        source: 'apis', url: URL, quote: buf, retrieved: r.fetched.slice(0, 10),
      })
    }
    buf = null
  }
}

mkdirSync('data/rows/bulk', { recursive: true })
writeFileSync('data/rows/bulk/apis.json', JSON.stringify({ source: 'apis', url: URL, rows }, null, 1))
console.log(`${rows.length} APIS rows, ${new Set(rows.map((r) => r.modelNumber)).size} model numbers`)
if (skipped.length) console.log(`skipped ${skipped.length}:\n  ` + skipped.slice(0, 30).join('\n  '))
