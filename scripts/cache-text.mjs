// node scripts/cache-text.mjs <url> <text-file>
//
// For pages that only load in a real browser (notebookcheck.net, FCC, LTT
// Labs): save the page text read in Chrome into the receipt cache under the
// page's URL, so verify-quotes can check rows against it like any fetched
// page. The meta records `via: chrome` so the provenance stays visible.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { PAGES, pathsOf } from './lib/pages.mjs'

const [url, file] = process.argv.slice(2)
if (!url || !file) {
  console.error('usage: node scripts/cache-text.mjs <url> <text-file>')
  process.exit(1)
}
const text = readFileSync(file, 'utf8')
const p = pathsOf(url)
mkdirSync(PAGES, { recursive: true })
writeFileSync(p.txt, text)
writeFileSync(p.raw, text)
writeFileSync(p.meta, JSON.stringify({ url, finalUrl: url, status: 200, type: 'text/plain', bytes: text.length, fetched: new Date().toISOString(), via: 'chrome' }, null, 2))
console.log(JSON.stringify({ url, txt: p.txt, bytes: text.length, via: 'chrome' }))
