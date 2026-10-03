// Page cache for receipts. Every fetched page lands in data/raw/pages/ keyed
// by the sha1 of the URL that was actually fetched, as the raw bytes, a
// normalized text dump, and a meta file. verify-quotes.mjs matches row quotes
// against the text dump, so a quote only counts if this cache has the page.
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
export const PAGES = join(root, 'data/raw/pages')

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// Wayback and GSMArena rate-limit per IP, and several research agents share
// this IP. A timestamp file per host paces every process on this machine to
// one request per gap. Racy, but close enough to stay under the limits.
// Wayback refuses connections outright (not a 429) for a while once an IP
// passes roughly 15 requests a minute.
const GAPS = { 'web.archive.org': 4500, 'www.gsmarena.com': 3000 }
async function pace(url) {
  const host = new URL(url).host
  const gap = GAPS[host]
  if (!gap) return
  const file = join(root, `data/raw/.pace-${host}`)
  mkdirSync(dirname(file), { recursive: true })
  for (;;) {
    const last = existsSync(file) ? +readFileSync(file, 'utf8') || 0 : 0
    const wait = last + gap - Date.now()
    if (wait <= 0) break
    await sleep(wait + Math.random() * 500)
  }
  writeFileSync(file, String(Date.now()))
}

// Wayback rate-limits hard (429) and flakes (5xx); back off and retry.
async function get(url, tries = url.includes('web.archive.org') ? 10 : 6) {
  for (let i = 0; ; i++) {
    await pace(url)
    const res = await fetch(url, { headers: { 'user-agent': UA, accept: '*/*' }, redirect: 'follow' }).catch((e) => ({ status: 0, error: e }))
    // Wayback sometimes refuses HTTPS from this IP while plain HTTP still answers.
    if (res.status === 0 && url.startsWith('https://web.archive.org/')) url = url.replace('https://', 'http://')
    if ((res.status === 429 || res.status >= 500 || res.status === 0) && i < tries - 1) {
      await sleep(Math.min(120_000, 3000 * 2 ** i))
      continue
    }
    return res
  }
}

export const hashOf = (url) => createHash('sha1').update(url).digest('hex').slice(0, 16)

export const pathsOf = (url) => {
  const h = hashOf(url)
  return { raw: join(PAGES, `${h}.raw`), txt: join(PAGES, `${h}.txt`), meta: join(PAGES, `${h}.meta.json`) }
}

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', deg: '°', times: '×', hellip: '…', reg: '®', trade: '™', copy: '©', middot: '·', frac12: '½', sup2: '²' }

export function htmlToText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(br|\/p|\/div|\/li|\/tr|\/h\d|\/td|\/th)[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
    .replace(/&([a-z0-9]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m)
    .replace(/[ \t\r\f\v]+/g, ' ')
    .replace(/\n\s*/g, '\n')
}

function pdfToText(rawPath) {
  return execFileSync(
    'python3',
    ['-c', 'import sys,pypdf;r=pypdf.PdfReader(sys.argv[1]);print("\\n".join((p.extract_text() or "") for p in r.pages))', rawPath],
    { maxBuffer: 1 << 28 },
  ).toString()
}

// Quote matching ignores case, whitespace, curly-vs-straight quotes, dash
// flavors, and non-breaking spaces. Nothing else.
export function norm(s) {
  return s
    .normalize('NFKC')
    .replace(/[‘’ʼ′]/g, "'")
    .replace(/[“”″]/g, '"')
    .replace(/[‐-―−]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

export async function fetchPage(url, { force = false } = {}) {
  const p = pathsOf(url)
  if (!force && existsSync(p.meta)) return { ...JSON.parse(readFileSync(p.meta, 'utf8')), cached: true, ...p }
  mkdirSync(PAGES, { recursive: true })
  const res = await get(url)
  if (res.status !== 200) return { url, status: res.status, error: res.error?.message ?? `HTTP ${res.status}`, cached: false }
  const buf = Buffer.from(await res.arrayBuffer())
  const type = res.headers.get('content-type') ?? ''
  writeFileSync(p.raw, buf)
  const isPdf = type.includes('pdf') || buf.subarray(0, 5).toString() === '%PDF-'
  const text = isPdf ? pdfToText(p.raw) : htmlToText(buf.toString('utf8'))
  writeFileSync(p.txt, text)
  const meta = { url, finalUrl: res.url, status: res.status, type, bytes: buf.length, fetched: new Date().toISOString() }
  writeFileSync(p.meta, JSON.stringify(meta, null, 2))
  if (res.url && res.url !== url) {
    const q = pathsOf(res.url)
    writeFileSync(q.raw, buf), writeFileSync(q.txt, text), writeFileSync(q.meta, JSON.stringify({ ...meta, url: res.url }, null, 2))
  }
  return { ...meta, cached: false, ...p }
}

export const readText = (url) => {
  const p = pathsOf(url)
  return existsSync(p.txt) ? readFileSync(p.txt, 'utf8') : null
}

// Wayback redirects /web/<timestamp prefix>id_/<url> to the closest capture,
// which is much faster than a CDX lookup (45 s+). `near` is any yyyymmdd
// prefix; omitted means the latest capture. id_ serves the archived bytes
// without the Wayback toolbar. fetchPage caches the page under the final
// capture URL too, and that URL is what a row's archiveUrl should hold.
export const waybackUrl = (url, near) => `https://web.archive.org/web/${near ?? '2026'}id_/${url}`
