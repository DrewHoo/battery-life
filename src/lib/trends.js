// Category averages for the "how it changed" view.
//
// Each series (a product line at one size, data/ref/series.json) counts once
// per year: its median that year. A category's yearly value is the mean of
// its series' medians, so a year with three MacBook Pro sizes doesn't outweigh
// a year with one XPS 13. A centered three-year mean then smooths the line.
// Battery life and power draw use grade A/B results only.

export const MEASURES = [
  ['wh', 'battery', 'Wh'],
  ['h', 'battery life', 'h'],
  ['w', 'power draw', 'W'],
]
export const TREND_CATS = [
  ['phone', 'Phones'],
  ['tablet', 'Tablets'],
  ['laptop', 'Laptops'],
]
export const BASE_YEAR = 2012

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b)
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2
}
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length
const groupBy = (xs, key) => xs.reduce((m, x) => ((m[key(x)] ??= []).push(x), m), {})

const measured = (d) => d.runtime && (d.runtime.grade === 'A' || d.runtime.grade === 'B')
export const measureOf = {
  wh: (d) => d.wh,
  h: (d) => (measured(d) ? d.runtime.value : null),
  w: (d) => (measured(d) && d.wh != null ? d.wh / d.runtime.value : null),
}

export function categoryTrends(devices) {
  const out = []
  for (const [m] of MEASURES) {
    for (const [cat, label] of TREND_CATS) {
      const ds = devices.filter((d) => d.category === cat && measureOf[m](d) != null)
      const yearly = Object.entries(groupBy(ds, (d) => +d.date.slice(0, 4)))
        .map(([y, g]) => [+y, mean(Object.values(groupBy(g, (d) => d.series)).map((s) => median(s.map(measureOf[m]))))])
        .sort((a, b) => a[0] - b[0])
      const smooth = yearly.map(([y]) => {
        const win = yearly.filter(([yy]) => Math.abs(yy - y) <= 1).map(([, v]) => v)
        return [y, mean(win)]
      })
      const base = smooth.find(([y]) => y === BASE_YEAR)?.[1]
      if (!base) continue
      for (const [y, v] of smooth) out.push({ measure: m, cat, label, year: y, t: Date.UTC(y, 6, 1), value: v, index: v / base })
    }
  }
  return out
}
