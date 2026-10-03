// The chart, as an Observable Plot figure. The same function runs in the
// prerender (with a linkedom document) and in the browser, so the deployed
// HTML already contains the SVG.
import * as Plot from '@observablehq/plot'
import { valueOf, strongOf } from './model.js'

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
const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b)
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2
}

// One trend per series (a line at one size or tier, data/ref/series.json):
// the median of each release year, so two configs in one year draw one point.
// Points sit at the mean release date of that year's devices.
export function trends(devices, metric) {
  const out = []
  for (const [series, ds] of Object.entries(Object.groupBy(devices, (d) => d.series))) {
    const pts = Object.values(Object.groupBy(ds, (d) => d.date.slice(0, 4)))
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

const niceMax = (v) => (v <= 2 ? Math.ceil(v * 4) / 4 : v <= 30 ? Math.ceil(v / 5) * 5 : Math.ceil(v / 20) * 20)

export function buildChart({ devices, metric, width, height, document, labels = true }) {
  const y = (d) => valueOf(d, metric)
  const tr = trends(devices, metric)
  const last = Object.values(Object.groupBy(tr, (p) => p.series)).map((ps) => ps.at(-1))
  const wh = metric === 'wh'
  const yMax = Math.max(...devices.map(y), 1)
  const cats = new Set(devices.map((d) => d.category))
  const fig = Plot.plot({
    document,
    width,
    height,
    marginLeft: 40,
    marginRight: labels ? 132 : 24,
    marginTop: 16,
    marginBottom: 28,
    style: { background: 'transparent', color: C.faint, fontFamily: "'IBM Plex Mono', monospace", fontSize: '10.5px', overflow: 'visible' },
    x: { type: 'utc', domain: [Date.UTC(2007, 0, 1), Date.UTC(2027, 0, 1)], ticks: 10, tickSize: 0, label: null },
    y: wh && cats.size > 1
      ? { type: 'log', domain: [cats.has('watch') ? 0.2 : cats.has('phone') ? 3 : 15, 120], ticks: [0.3, 1, 3, 10, 30, 100].filter((t) => t >= (cats.has('watch') ? 0.2 : cats.has('phone') ? 3 : 15)), tickFormat: (v) => `${v}`, label: 'Wh', grid: true, tickSize: 0 }
      : { domain: [0, niceMax(yMax)], label: wh ? 'Wh' : 'hours', grid: true, tickSize: 0 },
    symbol: { domain: ['phone', 'tablet', 'watch', 'laptop'], range: ['phone', 'tablet', 'watch', 'laptop'].map((c) => SYMBOL[c]) },
    marks: [
      Plot.gridY({ stroke: C.line, strokeOpacity: 1, strokeDasharray: '1,3' }),
      Plot.line(tr, { x: 't', y: 'v', z: 'series', stroke: C.faint, strokeWidth: 1, strokeOpacity: 0.8 }),
      Plot.dot(devices, {
        x: 't', y, symbol: 'category', r: 3.4,
        fill: (d) => (strongOf(d, metric) ? C.cream : C.bg),
        stroke: (d) => (strongOf(d, metric) ? C.cream : C.muted),
        strokeWidth: 1.1,
        strokeOpacity: (d) => (!wh && d.runtime?.grade === 'D' ? 0.45 : 1),
      }),
      // End labels go through spread() after the scales exist, below.
    ],
  })
  if (labels) {
    const xs = fig.scale('x'), ys = fig.scale('y')
    const svg = fig.tagName === 'svg' ? fig : fig.querySelector('svg')
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    g.setAttribute('font-size', '10.5')
    g.setAttribute('fill', C.muted)
    for (const l of spread(last, (t) => xs.apply(t), (v) => ys.apply(v))) {
      const t = document.createElementNS('http://www.w3.org/2000/svg', 'text')
      t.setAttribute('x', String(l.px))
      t.setAttribute('y', String(l.py))
      t.setAttribute('dy', '0.32em')
      t.setAttribute('text-anchor', 'start')
      t.textContent = l.series
      g.appendChild(t)
    }
    svg.appendChild(g)
  }
  return fig
}
