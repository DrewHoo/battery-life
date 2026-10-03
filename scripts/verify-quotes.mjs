// node scripts/verify-quotes.mjs [rows-file ...]
//
// Every row's quote must appear in the cached text of the page it was taken
// from (archiveUrl if the row has one, else url). Prints failures and exits 1
// if any row fails. With no arguments, checks every file under data/rows/.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { norm, readText } from './lib/pages.mjs'

const walk = (d) =>
  readdirSync(d).flatMap((f) => {
    const p = join(d, f)
    return statSync(p).isDirectory() ? walk(p) : p.endsWith('.json') ? [p] : []
  })

const files = process.argv.slice(2).length ? process.argv.slice(2) : walk('data/rows')
const textCache = new Map()
const text = (u) => {
  if (!textCache.has(u)) textCache.set(u, readText(u) && norm(readText(u)))
  return textCache.get(u)
}

let ok = 0
const fail = []
for (const f of files) {
  const { rows = [] } = JSON.parse(readFileSync(f, 'utf8'))
  for (const r of rows) {
    const src = r.archiveUrl ?? r.url
    const t = text(src)
    if (!r.quote) fail.push({ f, r, why: 'no quote' })
    else if (t == null) fail.push({ f, r, why: 'page not cached' })
    else if (!t.includes(norm(r.quote))) fail.push({ f, r, why: 'quote not on page' })
    else if (r.protocolQuote && !t.includes(norm(r.protocolQuote))) fail.push({ f, r, why: 'protocolQuote not on page' })
    else ok++
  }
}

console.log(`${ok} verified, ${fail.length} failed`)
for (const { f, r, why } of fail)
  console.log(`  ${why}: ${f} ${r.device} ${r.field}=${r.value} ${r.archiveUrl ?? r.url}\n    "${(r.quote ?? '').slice(0, 160)}"`)
process.exit(fail.length ? 1 : 0)
