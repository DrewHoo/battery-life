import { useEffect, useMemo, useState } from 'react'
import Chart from './Chart.jsx'
import Sentence from './Sentence.jsx'
import { BRANDS, CATEGORIES, DEVICES, GENERATED, METRICS, SCALES, hasData, select } from './lib/model.js'
import { readParam, writeParams } from './urlState.js'

const DEFAULTS = { metric: 'trend', cat: 'all', brand: 'all', scale: 'linear' }
const SETUP = {
  trend:
    'Each category’s average since 2012. Phones got longer battery life by carrying bigger batteries; laptops got there on the same battery by drawing half the power.',
  vs: 'Each mark is a device; trails follow a product line through its generations. Dashed diagonals are constant power draw: a trail running up and to the right got a bigger battery, one climbing straight up got more efficient.',
  w: 'Battery capacity divided by hours of Wi-Fi browsing at about 150 nits: the average power the device drew while you used it.',
  h: 'Hours of continuous Wi-Fi web browsing, from a full charge to shutdown, screen at about 150 nits. Filled marks are lab tests at a fixed brightness; hollow ones are older tests or the maker’s claim.',
  wh: 'Watt-hours, from each maker’s battery shipping sheets, spec pages and teardowns. Filled marks come from the maker or a teardown; hollow ones from aggregators.',
}

// A view switch that leaves nothing to draw falls back to every device,
// then every brand.
const fit = (v) => (hasData(v) ? v : hasData({ ...v, cat: 'all' }) ? { ...v, cat: 'all' } : { ...v, cat: 'all', brand: 'all' })

export default function App() {
  const [view, setView] = useState(DEFAULTS)

  useEffect(() => {
    const m = readParam('m'), c = readParam('c'), b = readParam('b'), sc = readParam('s')
    const next = { ...DEFAULTS }
    if (METRICS.some(([k]) => k === m)) next.metric = m
    if (CATEGORIES.some(([k]) => k === c)) next.cat = c
    if (BRANDS.includes(b)) next.brand = b
    if (SCALES.some(([k]) => k === sc)) next.scale = sc
    setView(fit(next))
  }, [])

  const update = (patch) => {
    const next = { ...view, ...patch }
    const fitted = fit(next)
    Object.assign(next, fitted)
    setView(next)
    writeParams({ m: next.metric === DEFAULTS.metric ? null : next.metric, c: next.cat === 'all' ? null : next.cat, b: next.brand === 'all' ? null : next.brand, s: next.scale === 'linear' ? null : next.scale })
    window.dhAnalytics?.track('View', next)
  }
  const on = { metric: (metric) => update({ metric }), cat: (cat) => update({ cat }), brand: (brand) => update({ brand }), scale: (scale) => update({ scale }) }

  const devices = useMemo(() => select(view), [view])

  return (
    <main>
      <div className="dateline">
        <span>drewhoover.com · 2007–2026 · updated {GENERATED}</span>
        <span>{DEVICES.length} devices</span>
      </div>
      <h1>Battery Life</h1>
      <Sentence {...view} on={on} />
      <p className="setup">{SETUP[view.metric]}</p>
      <Chart devices={devices} metric={view.metric} labels={view.cat !== 'all'} scale={view.scale} brands={view.brand === 'all'} />
      {view.metric !== 'trend' && <p className="legend">
        {view.brand !== 'all' && <><span>● phone</span> <span>■ tablet</span> <span>▲ watch</span> <span>◆ laptop</span></>}
        <span className="legend-note">lines follow each product line at one size · tap a mark for its source</span>
      </p>}
    </main>
  )
}
