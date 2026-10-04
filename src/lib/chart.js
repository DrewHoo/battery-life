// The charts, as Observable Plot figures. The same functions run in the
// prerender (with a linkedom document) and in the browser, so the deployed
// HTML already contains the SVG. Each figure carries `devicePos(d)` -> [x, y]
// in pixels when its marks are devices, which the hover layer uses.
import * as Plot from '@observablehq/plot'
import { valueOf, strongOf } from './model.js'
import { BASE_YEAR, MEASURES, categoryTrends } from './trends.js'
import { brandIcon } from './brands.js'

export const C = {
  bg: '#282127',
  ink: '#efe6d9',
  muted: '#bfb2a6',
  faint: '#857a75',
  line: '#453a42',
  cream: '#f3e2bc',
  rust: '#c36c36',
}

const SYMBOL = { phone: 'circle', tablet: 'square', watch: 'triangle', laptop: 'diamond' }
// Object.groupBy is missing from Node 20 (CI) and pre-2024 mobile Safari.
const groupBy = (xs, key) => xs.reduce((m, x) => ((m[key(x)] ??= []).push(x), m), {})
const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b)
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2
}
const STYLE = (small) => ({ background: 'transparent', color: C.faint, fontFamily: "'IBM Plex Mono', monospace", fontSize: small ? '9.5px' : '10.5px', overflow: 'visible' })
const svgOf = (fig) => (fig.tagName.toLowerCase() === 'svg' ? fig : fig.querySelector('svg'))

export const heightFor = (metric, w) =>
  metric === 'trend'
    ? w < 560 ? 3 * 210 : Math.round(Math.max(300, Math.min(380, w * 0.36)))
    : Math.round(Math.max(360, Math.min(560, w * (metric === 'vs' ? 0.62 : 0.58))))

// One trend per series (a line at one size or tier, data/ref/series.json):
// the median of each release year, so two configs in one year draw one point.
// Points sit at the mean release date of that year's devices.
export function trends(devices, metric) {
  const out = []
  for (const [series, ds] of Object.entries(groupBy(devices, (d) => d.series))) {
    const pts = Object.values(groupBy(ds, (d) => d.date.slice(0, 4)))
      .map((g) => ({ series, t: g.reduce((a, d) => a + d.t, 0) / g.length, v: median(g.map((d) => valueOf(d, metric))) }))
      .sort((a, b) => a.t - b.t)
    out.push(...pts)
  }
  return out
}

// End labels sit just right of each series' last point, pushed apart
// vertically from any earlier label they would overlap.
function spread(labels, x, y, gap = 12) {
  const ls = labels.map((l) => ({ ...l, px: x(l.t) + 8, py: y(l.v) })).sort((a, b) => a.py - b.py)
  for (let i = 1; i < ls.length; i++)
    for (let j = 0; j < i; j++)
      if (Math.abs(ls[i].px - ls[j].px) < 120 && ls[i].py - ls[j].py < gap) ls[i].py = ls[j].py + gap
  return ls
}

function addText(document, svg, items, attrs = {}) {
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g')
  for (const [k, v] of Object.entries({ 'font-size': '10.5', fill: C.muted, ...attrs })) g.setAttribute(k, v)
  for (const it of items) {
    const t = document.createElementNS('http://www.w3.org/2000/svg', 'text')
    t.setAttribute('x', String(it.x))
    t.setAttribute('y', String(it.y))
    t.setAttribute('dy', '0.32em')
    t.setAttribute('text-anchor', it.anchor ?? 'start')
    if (it.fill) t.setAttribute('fill', it.fill)
    t.textContent = it.text
    g.appendChild(t)
  }
  svg.appendChild(g)
}

const niceMax = (v) => (v <= 2 ? Math.ceil(v * 4) / 4 : v <= 30 ? Math.ceil(v / 5) * 5 : Math.ceil(v / 20) * 20)
const LOG_TICKS = [0.2, 0.3, 0.5, 1, 2, 3, 5, 10, 20, 30, 50, 100]
const SYMBOL_SCALE = { domain: ['phone', 'tablet', 'watch', 'laptop'], range: ['phone', 'tablet', 'watch', 'laptop'].map((c) => SYMBOL[c]) }
// Device marks: brand icons when brands are mixed, category symbols when
// one brand is shown. Weak evidence draws hollow (symbols) or dim (icons).
const dots = (devices, metric, small, x, y, { brands = false, dim = false } = {}) =>
  brands
    ? Plot.image(devices, {
        x, y, width: small ? 9 : 12, height: small ? 9 : 12,
        src: (d) => brandIcon(d.brand, strongOf(d, metric) ? C.cream : C.faint),
        opacity: dim ? 0.3 : 1,
      })
    : Plot.dot(devices, {
        x, y, symbol: 'category', r: small ? 2.1 : 3.4,
        fill: (d) => (strongOf(d, metric) ? C.cream : C.bg),
        stroke: (d) => (strongOf(d, metric) ? C.cream : C.muted),
        strokeWidth: small ? 0.8 : 1.1,
        strokeOpacity: (d) => (dim ? 0.35 : metric === 'h' && d.runtime?.grade === 'D' ? 0.45 : 1),
        fillOpacity: dim ? 0.35 : 1,
      })

// ---- over time: battery life, capacity or power draw by release date ------
function buildTimeline({ devices, metric, width, height, document, labels, scale, brands }) {
  const small = width < 560
  const y = (d) => valueOf(d, metric)
  const tr = trends(devices, metric)
  const last = Object.values(groupBy(tr, (p) => p.series)).map((ps) => ps.at(-1))
  const yMax = Math.max(...devices.map(y), 1)
  const yMin = Math.min(...devices.map(y))
  const logDomain = [LOG_TICKS.findLast((t) => t <= yMin * 0.9) ?? 0.1, LOG_TICKS.find((t) => t >= yMax * 1.1) ?? 120]
  const log = metric === 'wh' && scale === 'log'
  const logTicks = LOG_TICKS.filter((t) => t >= logDomain[0] && t <= logDomain[1])
  const unit = { wh: 'Wh', h: 'hours', w: 'watts while browsing' }[metric]
  const fig = Plot.plot({
    document, width, height,
    marginLeft: small ? 30 : 40, marginRight: labels ? 132 : 24, marginTop: 16, marginBottom: 28,
    style: STYLE(small),
    x: { type: 'utc', domain: [Date.UTC(2007, 0, 1), Date.UTC(2027, 0, 1)], ticks: small ? 5 : 10, tickSize: 0, label: null },
    y: log
      ? { type: 'log', domain: logDomain, ticks: logTicks, tickFormat: (v) => `${v}`, label: unit, tickSize: 0 }
      : { domain: [0, niceMax(yMax)], label: unit, tickSize: 0 },
    symbol: SYMBOL_SCALE,
    marks: [
      Plot.gridY(log ? logTicks : undefined, { stroke: C.line, strokeOpacity: 1, strokeDasharray: '1,3' }),
      Plot.line(tr, { x: 't', y: 'v', z: 'series', stroke: C.faint, strokeWidth: small ? 0.7 : 1, strokeOpacity: 0.8 }),
      dots(devices, metric, small, 't', y, { brands }),
    ],
  })
  const xs = fig.scale('x'), ys = fig.scale('y')
  if (labels) addText(document, svgOf(fig), spread(last, (t) => xs.apply(t), (v) => ys.apply(v)).map((l) => ({ x: l.px, y: l.py, text: l.series })))
  fig.devicePos = (d) => [xs.apply(d.t), ys.apply(y(d))]
  return fig
}

const CAT_STROKE = { phone: C.cream, laptop: C.rust, tablet: C.muted }

// ---- capacity vs battery life, with lines of constant power draw ----------
const ISO_W = [0.5, 1, 2, 5, 10, 20]
function buildScatter({ devices, width, height, document, brands }) {
  const small = width < 560
  const xDom = [3, 120], yDom = [2, 32]
  const iso = ISO_W.flatMap((w) => xDom.map((x) => ({ w, x, y: x / w })))
  // Each series' trail: yearly medians of (Wh, hours), in release order.
  const trail = Object.entries(groupBy(devices, (d) => d.series)).flatMap(([series, ds]) =>
    Object.values(groupBy(ds, (d) => d.date.slice(0, 4)))
      .map((g) => ({ series, t: median(g.map((d) => d.t)), x: median(g.map((d) => d.wh)), y: median(g.map((d) => d.runtime.value)) }))
      .sort((a, b) => a.t - b.t),
  )
  // Category averages (same as the trends view), as one bold path each.
  const tr = categoryTrends(devices)
  const avg = []
  for (const r of tr.filter((r) => r.measure === 'h')) {
    const c = tr.find((q) => q.measure === 'wh' && q.cat === r.cat && q.year === r.year)
    if (c) avg.push({ cat: r.cat, label: r.label, year: r.year, x: c.value, y: r.value })
  }
  // Every third year plus the last keeps the path readable as a direction.
  const paths = Object.values(groupBy(avg, (a) => a.cat)).map((as) => as.filter((a, i) => i % 3 === 0 || i === as.length - 1))
  const pathPts = paths.flat()
  const starts = paths.map((as) => ({ ...as[0], text: `${as[0].label.toLowerCase()} ${as[0].year}` }))
  const finals = paths.map((as) => ({ ...as.at(-1), text: String(as.at(-1).year) }))
  const fig = Plot.plot({
    document, width, height,
    marginLeft: small ? 30 : 40, marginRight: 24, marginTop: 16, marginBottom: 32,
    style: STYLE(small),
    x: { type: 'log', domain: xDom, ticks: [3, 5, 10, 20, 50, 100], tickFormat: (v) => `${v}`, label: 'battery (Wh) →', labelAnchor: 'right', tickSize: 0 },
    y: { type: 'log', domain: yDom, ticks: [2, 3, 5, 10, 20, 30], tickFormat: (v) => `${v}`, label: '↑ hours of browsing', tickSize: 0 },
    symbol: SYMBOL_SCALE,
    marks: [
      Plot.line(iso, { x: 'x', y: 'y', z: 'w', stroke: C.faint, strokeOpacity: 0.5, strokeDasharray: '2,4', clip: true }),
      Plot.line(trail, { x: 'x', y: 'y', z: 'series', stroke: C.faint, strokeWidth: small ? 0.5 : 0.7, strokeOpacity: 0.25, clip: true }),
      dots(devices, 'vs', small, 'wh', (d) => d.runtime.value, { brands, dim: true }),
      Plot.line(pathPts, { x: 'x', y: 'y', z: 'cat', stroke: C.bg, strokeWidth: small ? 7 : 9, strokeOpacity: 0.85 }),
      Plot.line(pathPts, { x: 'x', y: 'y', z: 'cat', stroke: (a) => CAT_STROKE[a.cat], strokeWidth: small ? 3 : 3.5 }),
      Plot.dot(pathPts, { x: 'x', y: 'y', r: small ? 2.5 : 3, fill: (a) => CAT_STROKE[a.cat], stroke: C.bg, strokeWidth: 1 }),
      Plot.dot(finals, { x: 'x', y: 'y', r: small ? 4.5 : 6, fill: (a) => CAT_STROKE[a.cat], stroke: C.bg, strokeWidth: 2 }),
      ...[[starts, 'end', -8], [finals, 'start', 8]].map(([data, anchor, dx]) =>
        Plot.text(data, { x: 'x', y: 'y', text: 'text', textAnchor: anchor, dx, fill: (a) => CAT_STROKE[a.cat], stroke: C.bg, strokeWidth: 3, paintOrder: 'stroke', fontSize: small ? 9.5 : 10.5 }),
      ),
    ],
  })
  const xs = fig.scale('x'), ys = fig.scale('y')
  // Label each power line where it leaves the top or right edge.
  addText(
    document, svgOf(fig),
    ISO_W.map((w) => {
      const xTop = yDom[1] * w
      return xTop <= xDom[1]
        ? { x: xs.apply(xTop) + 4, y: ys.apply(yDom[1]) + 8, text: `${w} W`, anchor: 'start' }
        : { x: xs.apply(xDom[1]) - 2, y: ys.apply(xDom[1] / w) - 8, text: `${w} W`, anchor: 'end' }
    }),
    { fill: C.faint, 'font-size': small ? '9.5' : '10.5' },
  )
  fig.devicePos = (d) => [xs.apply(d.wh), ys.apply(d.runtime.value)]
  return fig
}

// ---- category averages, as a multiple of each category's 2012 level -------
function buildTrends({ devices, width, height, document }) {
  const small = width < 560
  const rows = categoryTrends(devices)
  const unit = Object.fromEntries(MEASURES.map(([m, , u]) => [m, u]))
  const title = Object.fromEntries(MEASURES.map(([m, t]) => [m, t]))
  const facet = small ? 'fy' : 'fx'
  const fmtV = (m, v) => (m === 'w' && v < 10 ? v.toFixed(1) : String(Math.round(v)))
  // End labels: one per (measure, category), nudged apart in log space.
  const ends = Object.values(groupBy(rows, (r) => r.measure + r.cat)).map((rs) => ({ ...rs.at(-1) }))
  for (const ms of Object.values(groupBy(ends, (r) => r.measure))) {
    ms.sort((a, b) => b.index - a.index)
    for (let i = 0; i < ms.length; i++) {
      const want = Math.log10(ms[i].index)
      ms[i].ly = i === 0 ? ms[i].index : 10 ** Math.min(want, Math.log10(ms[i - 1].ly) - 0.075)
    }
  }
  const fig = Plot.plot({
    document, width, height,
    marginLeft: small ? 34 : 40, marginRight: small ? 140 : 150, marginTop: 30, marginBottom: 28,
    style: STYLE(small),
    [facet]: { domain: MEASURES.map(([m]) => m), label: null, padding: small ? 0.3 : 0.42, axis: null },
    x: { type: 'utc', domain: [Date.UTC(2007, 0, 1), Date.UTC(2027, 0, 1)], ticks: [2010, 2015, 2020, 2025].map((y) => new Date(Date.UTC(y, 0, 1))), tickFormat: (t) => String(t.getUTCFullYear()), tickSize: 0, label: null },
    y: { type: 'log', domain: [0.4, 3.2], ticks: [0.5, 1, 2, 3], tickFormat: (v) => `${v}×`, label: `vs ${BASE_YEAR}`, tickSize: 0 },
    marks: [
      Plot.gridY([0.5, 2, 3], { stroke: C.line, strokeDasharray: '1,3' }),
      Plot.ruleY([1], { stroke: C.faint, strokeOpacity: 0.6 }),
      Plot.text(MEASURES.map(([m]) => m), { [facet]: (m) => m, text: (m) => `${title[m]} (${unit[m]})`, frameAnchor: 'top-left', dy: -16, fill: C.muted, fontSize: small ? 10 : 11 }),
      Plot.line(rows, { x: 't', y: 'index', z: 'cat', [facet]: 'measure', stroke: (r) => CAT_STROKE[r.cat], strokeWidth: 2, curve: 'monotone-x' }),
      Plot.text(ends, {
        x: 't', y: 'ly', [facet]: 'measure', dx: 6, textAnchor: 'start', fill: (r) => CAT_STROKE[r.cat],
        text: (r) => `${r.label} ${fmtV(r.measure, r.value)} ${unit[r.measure]} · ${r.index.toFixed(1)}×${r.baseYear !== BASE_YEAR ? ` since ${r.baseYear}` : ''}`,
        fontSize: small ? 9.5 : 10,
      }),
    ],
  })
  fig.devicePos = null
  return fig
}

export function buildChart(props) {
  const fig = props.metric === 'trend' ? buildTrends(props) : props.metric === 'vs' ? buildScatter(props) : buildTimeline(props)
  // The hover layer checks this, so it never pairs one view's devices with
  // another view's positions during the render that switches views.
  fig.metric = props.metric
  return fig
}
