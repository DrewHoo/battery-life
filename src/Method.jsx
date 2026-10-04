// Method and sources. The source tallies count the values the charts show,
// computed from the same payload, so the credits can't drift from the data.
import { DEVICES, ROWS } from './lib/model.js'

const SOURCES = [
  [/notebookcheck\.(com|net)$/, 'Notebookcheck', 'https://www.notebookcheck.net/', 'battery-life tests; German edition for most reviews'],
  [/gsmarena\.com$/, 'GSMArena', 'https://www.gsmarena.com/battery-test.php3', 'battery-test tables'],
  [/anandtech\.com$/, 'AnandTech', 'https://web.archive.org/web/2024/https://www.anandtech.com/', 'via the Internet Archive'],
  [/laptopmag\.com$/, 'Laptop Mag', 'https://www.laptopmag.com/'],
  [/tomsguide\.com$/, 'Tom’s Guide', 'https://www.tomsguide.com/'],
  [/tomshardware\.com$/, 'Tom’s Hardware', 'https://www.tomshardware.com/'],
  [/chemtrec\.blob\.core\.windows\.net$/, 'Apple & Beats Product Information Sheet', 'https://chemtrec.blob.core.windows.net/criterion/APIS_BPIS_Current.pdf', 'Apple’s battery shipping sheet, hosted by CHEMTREC'],
  [/apple\.com$/, 'Apple', 'https://support.apple.com/specs', 'tech specs and newsroom'],
  [/google\.com$|blog\.google$/, 'Google', 'https://support.google.com/store/answer/9682653', 'battery shipping sheet and Pixel specs'],
  [/samsung\.com$/, 'Samsung', 'https://news.samsung.com/', 'newsroom and spec pages'],
  [/lenovo\.com$/, 'Lenovo PSREF', 'https://psref.lenovo.com/'],
  [/dell\.com$/, 'Dell', 'https://www.dell.com/support/', 'setup and specifications guides'],
  [/ifixit\.com$/, 'iFixit', 'https://www.ifixit.com/', 'teardowns and battery labels'],
  [/everymac\.com$/, 'EveryMac', 'https://everymac.com/'],
  [/europa\.eu$/, 'EU EPREL', 'https://eprel.ec.europa.eu/', 'energy labels'],
]
const host = (u) => {
  try {
    return new URL(u).host.replace(/^www\./, '')
  } catch {
    return ''
  }
}
const sourceOf = (u) => SOURCES.find(([re]) => re.test(host(u)))

function tally() {
  const n = new Map()
  const add = (u, k) => {
    const s = sourceOf(u)
    const key = s ? s[1] : 'press and reviews'
    const row = n.get(key) ?? { s, wh: 0, h: 0 }
    row[k]++
    n.set(key, row)
  }
  for (const d of DEVICES) {
    if (d.whSrc) add(d.whSrc.url, 'wh')
    if (d.runtime?.sources?.[0]) add(d.runtime.sources[0].url, 'h')
  }
  return [...n.entries()].sort((a, b) => b[1].wh + b[1].h - (a[1].wh + a[1].h))
}

export default function Method() {
  const rows = tally()
  return (
    <section className="method">
      <h2>Method</h2>
      <p>
        <b>Normal use</b> is continuous web browsing over Wi-Fi with the screen at about 150 nits, from a full charge until the device shuts off.
        That is Notebookcheck’s battery test, the only one a single lab runs the same way on phones, tablets and laptops, at that brightness since
        2012. Results are graded: <b>A</b> is Notebookcheck at ~150 nits, <b>B</b> another lab’s browsing test at a fixed brightness (GSMArena and
        AnandTech at 200 nits, Laptop Mag and Tom’s at 150), <b>C</b> a browsing test at another or unstated brightness, <b>D</b> the maker’s
        claim. Filled marks are A and B. No result is adjusted from one brightness to another. Laptops reviewed in several configurations show
        the longest-running one.
      </p>
      <p>
        <b>Capacity</b> is watt-hours. Sources rank from the makers’ battery shipping sheets (Apple’s and Google’s UN38.3 documents) to spec
        pages, teardowns and aggregators; the value other sources agree with wins, and a value outside a plausible range for its category is
        dropped (Apple’s sheet lists an iPhone 4 at 0.525 Wh). mAh becomes Wh only when that battery’s voltage has its own source, so most
        Galaxy Watches have no capacity here rather than a guessed one.
      </p>
      <p>
        <b>Power draw</b> is capacity divided by measured hours. <b>Averages</b> count each product line at each size once per year, smooth over
        three years, and index to 2012 or the line’s first year after it. Watches have no comparable battery test, so they appear on capacity
        only.
      </p>
      <p>
        Every value links to the quoted line on the page it came from; {ROWS.toLocaleString()} sourced rows sit behind {DEVICES.length} devices.
        Data, rules and code: <a href="https://github.com/DrewHoo/battery-life">github.com/DrewHoo/battery-life</a>.
      </p>
      <table className="sources">
        <thead>
          <tr>
            <th>source</th>
            <th>capacity</th>
            <th>battery life</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([name, r]) => (
            <tr key={name}>
              <td>
                {r.s ? <a href={r.s[2]}>{name}</a> : name}
                {r.s?.[3] && <span className="src-note"> · {r.s[3]}</span>}
              </td>
              <td>{r.wh || ''}</td>
              <td>{r.h || ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="fine">
        Archived pages via the <a href="https://web.archive.org/">Internet Archive</a>. Apple, Google and Dell marks from{' '}
        <a href="https://simpleicons.org/">Simple Icons</a> (CC0); the Samsung mark from the samsung.com favicon as redrawn on{' '}
        <a href="https://commons.wikimedia.org/wiki/File:Samsung_icon.svg">Wikimedia Commons</a> (CC BY-SA); the Lenovo mark after the
        lenovo.com favicon. All trademarks belong to their owners and identify the devices only.
      </p>
    </section>
  )
}
