// node scripts/fetch-page.mjs <url> [--wayback[=yyyymmdd]] [--force] [--grep <text>]
//
// Fetches a page into the receipt cache and prints where its text dump is.
// --wayback fetches the closest Wayback capture instead of the live page.
// fetchedUrl in the output is the URL the text was cached under: put it in the
// row's archiveUrl whenever it differs from the url.
// --grep prints matching lines from the text dump, to find quotable lines.
import { fetchPage, waybackUrl, norm } from './lib/pages.mjs'
import { readFileSync } from 'node:fs'

const args = process.argv.slice(2)
const url = args.find((a) => !a.startsWith('--') && args[args.indexOf(a) - 1] !== '--grep')
const wb = args.find((a) => a.startsWith('--wayback'))
const gi = args.indexOf('--grep')
const grep = gi >= 0 ? args[gi + 1] : null
if (!url) {
  console.error('usage: node scripts/fetch-page.mjs <url> [--wayback[=yyyymmdd]] [--force] [--grep <text>]')
  process.exit(1)
}

let target = url
if (wb) {
  target = waybackUrl(url, wb.split('=')[1])
}
const r = await fetchPage(target, { force: args.includes('--force') })
console.log(JSON.stringify({ url, fetchedUrl: r.finalUrl ?? target, status: r.status, bytes: r.bytes, cached: r.cached, txt: r.txt, error: r.error }))
if (r.status !== 200) process.exit(3)
if (grep) {
  const needle = norm(grep)
  for (const line of readFileSync(r.txt, 'utf8').split('\n')) if (norm(line).includes(needle)) console.log('  | ' + line.trim().slice(0, 400))
}
