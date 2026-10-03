import { useEffect, useMemo, useState } from 'react'
import Chart from './Chart.jsx'
import Sentence from './Sentence.jsx'
import { BRANDS, CATEGORIES, DEVICES, GENERATED, METRICS, select } from './lib/model.js'
import { readParam, writeParams } from './urlState.js'

const DEFAULTS = { metric: 'h', cat: 'all', brand: 'all' }
const SETUP = {
  h: 'Hours of continuous Wi-Fi web browsing, from a full charge to shutdown, screen at about 150 nits. Filled marks are lab tests at a fixed brightness; hollow ones are older tests or the maker’s claim.',
  wh: 'Watt-hours, from each maker’s battery shipping sheets, spec pages and teardowns. Filled marks come from the maker or a teardown; hollow ones from aggregators.',
}

export default function App() {
  const [view, setView] = useState(DEFAULTS)

  useEffect(() => {
    const m = readParam('m'), c = readParam('c'), b = readParam('b')
    const next = { ...DEFAULTS }
    if (METRICS.some(([k]) => k === m)) next.metric = m
    if (CATEGORIES.some(([k]) => k === c)) next.cat = c
    if (BRANDS.includes(b)) next.brand = b
    if (next.metric === 'h' && next.cat === 'watch') next.cat = 'all'
    setView(next)
  }, [])

  const update = (patch) => {
    const next = { ...view, ...patch }
    if (next.metric === 'h' && next.cat === 'watch') next.cat = 'all'
    setView(next)
    writeParams({ m: next.metric === DEFAULTS.metric ? null : next.metric, c: next.cat === 'all' ? null : next.cat, b: next.brand === 'all' ? null : next.brand })
    window.dhAnalytics?.track('View', next)
  }
  const on = { metric: (metric) => update({ metric }), cat: (cat) => update({ cat }), brand: (brand) => update({ brand }) }

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
      <Chart devices={devices} metric={view.metric} labels={view.cat !== 'all'} />
      <p className="legend">
        <span>● phone</span> <span>■ tablet</span> <span>▲ watch</span> <span>◆ laptop</span>
        <span className="legend-note">lines follow each product line at one size · tap a mark for its source</span>
      </p>
    </main>
  )
}
