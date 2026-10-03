// rows + rules -> src/data/payload.json
//
// Joins every research row (data/rows/specs, data/rows/runtime) and bulk
// sheet row (data/rows/bulk) to the roster, applies data/ref/corrections.json,
// ranks sources by data/ref/source-rank.json, grades runtime by
// data/ref/grades.json, and picks one displayed value per (device, field).
// Every alternate stays in the payload. The pick logic is the spec's
// "Capacity" and "Normal use" sections; change the rule files, not this.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const J = (p) => JSON.parse(readFileSync(p, 'utf8'))
const files = (d) => (existsSync(d) ? readdirSync(d).filter((f) => f.endsWith('.json')).map((f) => join(d, f)) : [])

const rank = J('data/ref/source-rank.json')
const grades = J('data/ref/grades.json')
const corrections = J('data/ref/corrections.json')
const bands = J('data/ref/bands.json')
const seriesRules = J('data/ref/series.json')
const seriesOf = (dev) => {
  const rest = dev.id.startsWith(dev.line + '-') ? dev.id.slice(dev.line.length + 1) : dev.id
  return (seriesRules[dev.line] ?? []).find((s) => new RegExp(s.match).test(rest))?.label ?? null
}

// ---- load ----------------------------------------------------------------
const excluded = new Map(J('data/ref/roster-exclude.json').devices.map((d) => [d.id, d.reason]))
const devices = new Map()
const rows = []
const rejections = []
for (const f of [...files('data/rows/specs'), ...files('data/rows/runtime')]) {
  const d = J(f)
  for (const dev of d.devices ?? []) {
    if (excluded.has(dev.id)) continue
    const prev = devices.get(dev.id)
    devices.set(dev.id, prev ? { ...dev, ...prev, modelNumbers: [...new Set([...(prev.modelNumbers ?? []), ...(dev.modelNumbers ?? [])])] } : { ...dev })
  }
  for (const r of d.rows ?? []) if (!excluded.has(r.device)) rows.push({ ...r, file: f })
  for (const r of d.rejections ?? []) rejections.push({ ...r, file: f })
}

// Model numbers come from the device entry and from model_number rows.
const modelToDevices = new Map()
for (const dev of devices.values()) {
  const nums = new Set(dev.modelNumbers ?? [])
  for (const r of rows) if (r.device === dev.id && r.field === 'model_number') nums.add(String(r.value).trim())
  dev.modelNumbers = [...nums]
  for (const n of nums) modelToDevices.set(n, [...(modelToDevices.get(n) ?? []), dev.id])
}

// Bulk sheets join through model numbers (APIS) and googleName (Google).
const sharedModels = []
const apisRows = J('data/rows/bulk/apis.json').rows
// A model number with an "after activation" row: its shipping-rating row is
// not the device's capacity.
const unlocked = new Set(apisRows.filter((r) => r.activation === 'after').map((r) => r.modelNumber))
for (const r of apisRows.filter((r) => r.activation === 'after' || !unlocked.has(r.modelNumber))) {
  const ids = modelToDevices.get(r.modelNumber) ?? []
  // An A-number that spans several model years can't say which year's battery
  // its one Wh value describes, so it drops to aggregator rank there.
  if (ids.length > 1) sharedModels.push({ modelNumber: r.modelNumber, devices: ids, wh: r.value })
  for (const id of ids) rows.push({ ...r, device: id, shared: ids.length > 1 })
}
const byGoogleName = new Map([...devices.values()].filter((d) => d.googleName).map((d) => [d.googleName.toLowerCase(), d.id]))
for (const r of J('data/rows/bulk/google-un.json').rows) {
  const id = byGoogleName.get(r.product.toLowerCase())
  if (id) rows.push({ ...r, device: id })
}

// GSMArena battery tables join through the GSMArena device pages that this
// device's own spec rows cite (a page cited by two devices joins neither).
const gsmPage = (u) => u?.match(/gsmarena\.com\/([a-z0-9_]+-\d+\.php)$/)?.[1]
const pageToDevices = new Map()
for (const r of rows) {
  const pg = gsmPage(r.url)
  if (pg && r.device) pageToDevices.set(pg, new Set([...(pageToDevices.get(pg) ?? []), r.device]))
}
for (const r of J('data/rows/bulk/gsmarena-battery.json').rows) {
  const ids = [...(pageToDevices.get(r.gsmarenaPage) ?? [])]
  if (ids.length === 1) rows.push({ ...r, device: ids[0] })
}

// Per-line field renames (data/ref/field-map.json), before anything picks.
const fieldMap = J('data/ref/field-map.json')
for (const r of rows) {
  const m = fieldMap[devices.get(r.device)?.line]
  if (m?.[r.field]) r.field = m[r.field]
}

// ---- corrections ---------------------------------------------------------
const matches = (c, r) =>
  (!c.device || c.device === r.device) &&
  (!c.modelNumber || c.modelNumber === r.modelNumber) &&
  (!c.field || c.field === r.field) &&
  (!c.source || c.source === r.source) &&
  (!c.urlIncludes || (r.url ?? '').includes(c.urlIncludes)) &&
  (!c.raw || c.raw === r.raw)
const used = new Set()
const live = rows.filter((r) => {
  const c = corrections.exclude.find((c) => matches(c, r))
  if (c) used.add(c)
  return !c
})
for (const r of live)
  for (const c of corrections.patch)
    if (matches(c, r)) {
      used.add(c)
      r.patchedFrom = r.value
      r.value = c.value
      r.patchReason = c.reason
    }
const unusedCorrections = [...corrections.exclude, ...corrections.patch].filter((c) => !used.has(c))

// ---- ranking -------------------------------------------------------------
const hostOf = (u) => {
  try {
    return new URL(u).host.replace(/^www\./, '')
  } catch {
    return ''
  }
}
const pathOf = (u) => {
  try {
    return new URL(u).pathname
  } catch {
    return ''
  }
}
function sourceRank(r) {
  const host = hostOf(r.url)
  for (const rule of rank.rules) {
    if (rule.source && !rule.source.includes(r.source)) continue
    if (rule.host && !rule.host.some((h) => host === h || host.endsWith('.' + h))) continue
    if (!rule.source && !rule.host?.length) continue
    if (rule.path && !new RegExp(rule.path).test(pathOf(r.url))) continue
    if (rule.pathNot && new RegExp(rule.pathNot).test(pathOf(r.url))) continue
    const out = { rank: rule.rank, tier: rule.tier }
    if (r.shared) return { rank: 4, tier: 'transport-shared' }
    return out
  }
  return { ...rank.default }
}
for (const r of live) Object.assign(r, sourceRank(r))

function gradeOf(r) {
  if (r.field === 'claimed_runtime_h') return 'D'
  for (const g of grades.rules) {
    if (g.outlet && !g.outlet.includes(r.outlet)) continue
    if (g.testDateFrom && !(r.testDate >= g.testDateFrom)) continue
    if (g.network && !g.network.includes(r.network)) continue
    if (g.brightnessNits && !g.brightnessNits.includes(r.brightnessNits)) continue
    return g.grade
  }
  return grades.default
}

// ---- picks ---------------------------------------------------------------
const src = (r) => ({
  value: r.value, url: r.url, archiveUrl: r.archiveUrl ?? undefined, quote: r.quote, tier: r.tier,
  ...(r.derived ? { derived: r.derived } : {}), ...(r.patchReason ? { patched: r.patchReason } : {}),
})
const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b)
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2
}
const byRank = (a, b) => a.rank - b.rank

const report = { disputes: [], outOfBand: [], noCapacity: [], derivedOnly: [], claimRatios: [], sharedModels, unusedCorrections }
const out = []

for (const dev of devices.values()) {
  const mine = live.filter((r) => r.device === dev.id)
  const f = (field, kind) => mine.filter((r) => r.field === field && (kind === undefined || r.kind === kind))
  const pick = (field, kind) => f(field, kind).sort(byRank)[0]

  // capacity: stated Wh; mAh x V only as a fallback when no source states Wh
  // and both have receipts for this device
  const [lo, hi] = bands.capacity_wh[dev.category] ?? [0, Infinity]
  const whCands = f('capacity_wh').map((r) => ({ ...r, value: +r.value }))
  const mah = f('capacity_mah', 'rated').sort(byRank)[0]
  const volt = f('voltage_v').filter((r) => r.tier !== 'aftermarket').sort(byRank)[0]
  if (mah && volt && !whCands.some((r) => r.value >= lo && r.value <= hi)) {
    whCands.push({
      ...mah, field: 'capacity_wh', value: +((+mah.value * +volt.value) / 1000).toFixed(3),
      rank: Math.max(mah.rank, volt.rank), tier: 'derived',
      derived: { mah: src(mah), voltage: src(volt) },
    })
  }
  const inBand = whCands.filter((r) => r.value >= lo && r.value <= hi)
  for (const r of whCands.filter((r) => !inBand.includes(r))) report.outOfBand.push({ device: dev.id, value: r.value, tier: r.tier, url: r.url })
  inBand.sort(byRank)
  // Among the top-ranked candidates, the value the other sources agree with
  // wins (an APIS typo row loses to its siblings plus the teardown). Ties go
  // to the lower value, which covers two-supplier models.
  const agree = (a, b) => Math.abs(a.value - b.value) / a.value <= bands.agreement
  const support = (c) => inBand.filter((o) => o !== c && agree(c, o)).length
  const top = inBand.filter((r) => r.rank === inBand[0]?.rank)
  const whPick = top.length ? top.reduce((a, b) => (support(b) > support(a) || (support(b) === support(a) && b.value < a.value) ? b : a)) : null
  if (!whPick) report.noCapacity.push({ device: dev.id, mahOnly: f('capacity_mah').length > 0 })
  else if (whPick.tier === 'derived') report.derivedOnly.push(dev.id)
  const disputed = whPick ? inBand.filter((r) => r !== whPick && Math.abs(r.value - whPick.value) / whPick.value > bands.agreement) : []
  if (disputed.length) report.disputes.push({ device: dev.id, pick: { value: whPick.value, tier: whPick.tier }, others: disputed.map((r) => ({ value: r.value, tier: r.tier, url: r.url })) })

  // runtime: best grade wins; within it, the median of that grade's results
  const rt = f('runtime_h').map((r) => ({ ...r, value: +r.value, grade: gradeOf(r) }))
  const best = ['A', 'B', 'C'].find((g) => rt.some((r) => r.grade === g))
  const bestRows = rt.filter((r) => r.grade === best)
  const claims = f('claimed_runtime_h').map((r) => ({ ...r, value: +r.value })).sort(byRank)
  const claimWeb = claims.find((r) => r.kind === 'internet_wifi')
  const pickRule = grades.pick[dev.category] ?? grades.pick.default
  const rtSrc = (r) => ({ ...src(r), outlet: r.outlet, raw: r.raw, testDate: r.testDate, brightnessNits: r.brightnessNits, note: r.note })
  const runtime = best
    ? pickRule === 'max'
      ? (() => {
          const top = bestRows.reduce((a, b) => (b.value > a.value ? b : a))
          return { value: top.value, grade: best, n: bestRows.length, pick: 'max', sources: [top, ...bestRows.filter((r) => r !== top)].map(rtSrc) }
        })()
      : { value: +median(bestRows.map((r) => r.value)).toFixed(2), grade: best, n: bestRows.length, pick: 'median', sources: bestRows.map(rtSrc) }
    : claimWeb
      ? { value: claimWeb.value, grade: 'D', n: 1, sources: [src(claimWeb)] }
      : null
  if (best === 'A' && claimWeb) report.claimRatios.push({ device: dev.id, line: dev.line, measured: runtime.value, claimed: claimWeb.value, ratio: +(runtime.value / claimWeb.value).toFixed(2) })

  const date = pick('release_date', 'released') ?? pick('release_date', 'announced') ?? pick('release_date')
  const one = (field, kind) => {
    const r = pick(field, kind)
    return r ? r.value : undefined
  }
  out.push({
    id: dev.id, line: dev.line, series: seriesOf(dev), category: dev.category, name: dev.name, variant: dev.variant ?? null,
    date: date?.value ?? null,
    wh: whPick ? +whPick.value : null,
    whSrc: whPick ? src(whPick) : null,
    // one alternate per (value, tier, url): several model numbers can hit the same APIS value
    whAlt: [...new Map(inBand.filter((r) => r !== whPick).map((r) => [`${r.value}|${r.tier}|${r.url}`, { value: r.value, tier: r.tier, url: r.url }])).values()],
    whDisputed: disputed.length > 0,
    mah: one('capacity_mah', 'rated') ?? one('capacity_mah', 'typical') ?? null,
    runtime,
    claims: claims.map((r) => ({ kind: r.kind, ...src(r) })),
    specs: {
      displayIn: one('display_in'), resolution: one('resolution_px'), panel: one('panel'), refreshHz: one('refresh_hz'),
      nitsTypical: one('brightness_nits', 'typical'), nitsHdr: one('brightness_nits', 'peak_hdr'),
      nitsOutdoor: one('brightness_nits', 'peak_outdoor'), nitsMeasured: one('brightness_nits', 'measured'),
      heightMm: one('height_mm'), widthMm: one('width_mm'), depthMm: one('depth_mm'), weightG: one('weight_g'),
      soc: f('soc').map((r) => r.value), processNm: one('process_nm'), chargingW: one('charging_w'),
      priceUsd: one('launch_price_usd'),
    },
  })
}

out.sort((a, b) => (a.date ?? '9999').localeCompare(b.date ?? '9999') || a.id.localeCompare(b.id))
mkdirSync('src/data', { recursive: true })
writeFileSync('src/data/payload.json', JSON.stringify({ generated: new Date().toISOString().slice(0, 10), devices: out }))
mkdirSync('data/build', { recursive: true })
writeFileSync('data/build/report.json', JSON.stringify({ ...report, rejections }, null, 1))
console.log(
  `${out.length} devices, ${out.filter((d) => d.wh).length} with Wh, ${out.filter((d) => d.runtime?.grade === 'A').length} grade-A runtime, ` +
    `${report.disputes.length} capacity disputes, ${report.outOfBand.length} out-of-band, ${unusedCorrections.length} unused corrections`,
)
