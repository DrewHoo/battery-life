// node scripts/coverage-report.mjs
//
// Run after build-payload. Prints suspects, not just counts: each section is
// a work list for a person or the next research pass. Exits 1 when a known
// answer fails or a displayed quote doesn't verify.
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const { devices } = JSON.parse(readFileSync('src/data/payload.json', 'utf8'))
const report = JSON.parse(readFileSync('data/build/report.json', 'utf8'))
const bands = JSON.parse(readFileSync('data/ref/bands.json', 'utf8'))
const byId = new Map(devices.map((d) => [d.id, d]))
let failed = false
const h = (s) => console.log(`\n## ${s}`)
const list = (xs, fmt, max = 40) => {
  for (const x of xs.slice(0, max)) console.log('  ' + fmt(x))
  if (xs.length > max) console.log(`  … ${xs.length - max} more`)
}

h('Quote verification')
try {
  console.log('  ' + execFileSync('node', ['scripts/verify-quotes.mjs'], { encoding: 'utf8' }).split('\n')[0])
} catch (e) {
  failed = true
  console.log(e.stdout.split('\n').slice(0, 30).map((l) => '  ' + l).join('\n'))
}

h('Known answers')
const known = [
  ['iphone-16', 'wh', 13.839, 'APIS A3288'],
  ['macbook-air-13-2008', 'wh', 37, 'Apple spec page via Wayback'],
  ['galaxy-s-s8', 'wh', 11.55, 'iFixit / GSMArena'],
  ['iphone-5', 'runtime', 15.83, 'Notebookcheck WiFi Surfing 15h 50min'],
]
for (const [id, k, want, why] of known) {
  const d = byId.get(id)
  const got = !d ? 'missing device' : k === 'wh' ? d.wh : d.runtime?.value
  const ok = typeof got === 'number' && Math.abs(got - want) < 0.02
  if (!ok) failed = true
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${id} ${k} = ${got} (want ${want}, ${why})`)
}
const orig = byId.get('iphone-2007')
const claim = orig?.claims.find((c) => c.kind === 'internet_wifi')
console.log(`  ${claim?.value === 6 ? 'ok  ' : 'FAIL'} iphone-2007 internet claim = ${claim?.value} (want 6)`)
if (claim?.value !== 6) failed = true

h('Capacity disputes (candidates more than 3% from the pick; year-spanning APIS rows left out)')
list(report.disputes.map((d) => ({ ...d, others: d.others.filter((o) => o.tier !== 'transport-shared') })).filter((d) => d.others.length), (d) => `${d.device}: pick ${d.pick.value} (${d.pick.tier}) vs ${d.others.map((o) => `${o.value} (${o.tier})`).join(', ')}`)

h('Capacity out of band')
list(report.outOfBand, (d) => `${d.device}: ${d.value} Wh (${d.tier}) ${d.url}`)

h('Shared model numbers (one APIS row, several devices)')
list(report.sharedModels, (s) => `${s.modelNumber} ${s.wh} Wh -> ${s.devices.join(', ')}`)

h('No capacity')
list(report.noCapacity, (d) => `${d.device}${d.mahOnly ? ' (mAh only, no sourced voltage)' : ''}`)

h('Capacity only by derivation (mAh x V)')
list(report.derivedOnly, (d) => d)

h('Variant consistency: same model numbers, different Wh')
const seen = new Map()
for (const d of devices) for (const n of [d.whSrc?.quote?.match(/^A\d{4}/)?.[0]].filter(Boolean)) seen.set(n, [...(seen.get(n) ?? []), d])
list([...seen].filter(([, ds]) => new Set(ds.map((d) => d.wh)).size > 1), ([n, ds]) => `${n}: ${ds.map((d) => `${d.id}=${d.wh}`).join(', ')}`)

h('Measured / claimed outside the band')
const [rlo, rhi] = bands.claimRatio
list(report.claimRatios.filter((r) => r.ratio < rlo || r.ratio > rhi), (r) => `${r.device}: ${r.measured} h measured / ${r.claimed} h claimed = ${r.ratio}`)
const perLine = Object.groupBy(report.claimRatios, (r) => r.line)
console.log('  median measured/claimed by line: ' + Object.entries(perLine).map(([l, rs]) => `${l} ${rs.map((r) => r.ratio).sort((a, b) => a - b)[rs.length >> 1]} (n=${rs.length})`).join(', '))

h('Coverage by line')
const lines = Object.groupBy(devices, (d) => d.line)
console.log('  line             devices  Wh   A    B    C    D   none')
for (const [line, ds] of Object.entries(lines)) {
  const g = (x) => ds.filter((d) => (d.runtime?.grade ?? 'none') === x).length
  console.log(`  ${line.padEnd(16)} ${String(ds.length).padStart(7)} ${String(ds.filter((d) => d.wh).length).padStart(4)} ${['A', 'B', 'C', 'D', 'none'].map((x) => String(g(x)).padStart(4)).join(' ')}`)
}

h('Missing runtime (no A/B/C), by line')
for (const [line, ds] of Object.entries(lines)) {
  const miss = ds.filter((d) => !d.runtime || d.runtime.grade === 'D')
  if (miss.length) console.log(`  ${line}: ${miss.map((d) => d.id).join(', ')}`)
}

h('Missing release date')
list(devices.filter((d) => !d.date), (d) => d.id)

h('Unused corrections')
list(report.unusedCorrections, (c) => JSON.stringify(c))

process.exit(failed ? 1 : 0)
