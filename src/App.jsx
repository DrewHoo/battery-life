import { useEffect, useMemo, useState } from 'react'
import Chart from './Chart.jsx'
import Method from './Method.jsx'
import Design from './Design.jsx'
import { CATEGORIES, DEVICES, GENERATED, select } from './lib/model.js'
import { readParam, writeParams } from './urlState.js'

// Regulatory lines on the battery-size chart. Module-level so the chart's
// effect sees a stable array.
// Each line only shows with the category it constrains.
const REF_100 = [{ y: 100, text: '100 Wh · most a passenger can carry on without airline approval' }]
const REF_20 = [{ y: 20, text: '20 Wh · lithium cells above this ship under stricter air-freight rules' }]
const REFS = { all: [...REF_100, ...REF_20], laptop: REF_100, phone: REF_20 }
const NO_WATCH = 'No outlet runs a consistent battery-life test on watches, so watches only appear in battery size.'

const SECTIONS = [
  {
    id: 'trend',
    title: 'The short version',
    text: 'Each line is a category’s average as a multiple of where it stood in 2012. Phones run longer because they carry bigger batteries. Laptops run longer on the same battery because they draw less power. Tablets have barely changed.',
  },
  {
    id: 'wh',
    title: 'Battery size',
    text: 'Phone batteries grew from about 5 Wh to about 18. Laptop batteries have averaged 55 to 70 Wh the whole time, and none here goes over 100 Wh, the airline carry-on limit; the 16-inch MacBook Pro has sat just under it since 2019. Phones are reaching 20 Wh, where single cells start shipping under stricter air-freight rules. Apple’s shipping sheet lists the iPhone 18 Pro Max at 19.79 Wh as shipped and 21.75 Wh after activation.',
    refs: true,
  },
  {
    id: 'h',
    title: 'Battery life',
    text: 'Hours of continuous Wi-Fi browsing at about 150 nits, from a full charge to shutdown. Phones, tablets and laptops all run about twice as long as they did in 2012. The mid-2010s dip in phones is real: the iPhone 6 through 7 and the Galaxy S6 through S10 ran 7 to 9 hours, less than the iPhone 5.',
  },
  {
    id: 'w',
    title: 'Power draw',
    text: 'Battery size divided by hours: the average power a device draws while you browse. Laptops went from about 7 W to under 4, mostly in two steps, Apple’s M1 in 2020 and the Snapdragon X and Lunar Lake chips in 2024. Phones have drawn about a watt the whole time. Their efficiency gains went into bigger screens.',
  },
  {
    id: 'vs',
    title: 'Size against life',
    text: 'Every device by battery size and battery life. The dashed diagonals are constant power draw. Phones moved right, to bigger batteries at the same draw. Laptops moved straight up, to more hours on the same battery.',
  },
]

const CAT_PARAM = new Set(CATEGORIES.map(([c]) => c))

export default function App() {
  const [cat, setCat] = useState('all')

  useEffect(() => {
    const c = readParam('c')
    if (CAT_PARAM.has(c)) setCat(c)
  }, [])

  const pick = (c) => {
    setCat(c)
    writeParams({ c: c === 'all' ? null : c })
    window.dhAnalytics?.track('Category', { cat: c })
  }

  const data = useMemo(() => Object.fromEntries(SECTIONS.map((s) => [s.id, select({ metric: s.id, cat, brand: 'all' })])), [cat])

  return (
    <main>
      <div className="dateline">
        <span>drewhoover.com · 2007–2026 · updated {GENERATED}</span>
        <span>{DEVICES.length} devices</span>
      </div>
      <h1>Battery Life</h1>
      <p className="setup">How the batteries in phones, tablets, laptops and watches changed from the first iPhone to now, and why.</p>
      <div className="cats" role="group" aria-label="Category">
        {CATEGORIES.map(([c, , label]) => (
          <button key={c} type="button" aria-pressed={c === cat} onClick={() => pick(c)}>
            {label}
          </button>
        ))}
      </div>
      {SECTIONS.map((s) => (
        <section className="story" key={s.id}>
          <h2>{s.title}</h2>
          <p>{s.text}</p>
          {cat === 'watch' && s.id !== 'wh' && s.id !== 'trend' ? (
            <p className="empty">{NO_WATCH}</p>
          ) : (
            <Chart id={s.id} devices={data[s.id]} metric={s.id} refs={s.refs ? REFS[cat] : undefined} labels={false} />
          )}
        </section>
      ))}
      <Method />
      <Design />
    </main>
  )
}
