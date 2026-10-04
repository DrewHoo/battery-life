import { useEffect, useMemo, useRef, useState } from 'react'
import { buildChart, C } from './lib/chart.js'
import { LINES, GRADE_WORDS, TIER_WORDS, valueOf } from './lib/model.js'

const SSR_WIDTH = 932
const heightFor = (w) => Math.round(Math.max(360, Math.min(540, w * 0.58)))

// In the prerender there is no document; scripts/prerender.mjs puts a
// linkedom one on globalThis.__plotDocument before rendering.
function ssrSvg(props) {
  const document = globalThis.__plotDocument
  if (!document) return ''
  return buildChart({ ...props, width: SSR_WIDTH, height: heightFor(SSR_WIDTH), document }).outerHTML
}

const fmtDate = (d) => new Date(d.t).toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' })
const hm = (h) => `${Math.floor(h)}h ${String(Math.round((h % 1) * 60)).padStart(2, '0')}m`
const host = (u) => {
  try {
    return new URL(u).host.replace(/^www\./, '')
  } catch {
    return u
  }
}

function Popover({ d, metric, pos, pinned, onClose }) {
  const src = metric === 'wh' ? d.whSrc : d.runtime?.sources?.[0]
  const href = src?.archiveUrl ?? src?.url
  return (
    <div className={'pop' + (pinned ? ' pinned' : '')} style={{ left: pos.left, top: pos.top }} role="dialog">
      {pinned && (
        <button className="pop-x" onClick={onClose} aria-label="Close">
          ×
        </button>
      )}
      <div className="pop-name">{d.name}</div>
      <div className="pop-meta">
        {d.series ?? LINES[d.line].label} · {fmtDate(d)}
      </div>
      <div className="pop-val">
        {metric === 'wh' ? `${d.wh} Wh` : hm(d.runtime.value)}
        <span className="pop-grade">
          {metric === 'wh' ? TIER_WORDS[d.whSrc?.tier] ?? d.whSrc?.tier : `${d.runtime.grade} · ${GRADE_WORDS[d.runtime.grade]}`}
        </span>
      </div>
      {metric === 'h' && d.runtime.pick === 'max' && d.runtime.n > 1 && (
        <div className="pop-meta">
          longest of {d.runtime.n} tested configs; others {d.runtime.sources.slice(1).map((s) => hm(s.value)).join(', ')}
        </div>
      )}
      {metric === 'h' && d.wh != null && <div className="pop-meta">{d.wh} Wh battery</div>}
      {metric === 'wh' && d.runtime && d.category !== 'watch' && <div className="pop-meta">{hm(d.runtime.value)} of browsing ({d.runtime.grade})</div>}
      {src?.quote && (
        <blockquote className="pop-q">
          “{src.quote.length > 220 ? src.quote.slice(0, 220) + '…' : src.quote}”
          {href && (
            <a href={href} target="_blank" rel="noreferrer">
              {host(src.url)}
            </a>
          )}
        </blockquote>
      )}
      {metric === 'wh' && d.whAlt?.length > 0 && (
        <div className="pop-meta">
          {d.whAlt.length} other source{d.whAlt.length > 1 ? 's' : ''}: {[...new Set(d.whAlt.map((a) => a.value))].slice(0, 4).join(', ')} Wh
        </div>
      )}
    </div>
  )
}

export default function Chart({ devices, metric, labels, scale }) {
  const wrap = useRef(null)
  const host = useRef(null)
  const [width, setWidth] = useState(null)
  const [plot, setPlot] = useState(null)
  const [hover, setHover] = useState(null)
  const [pinned, setPinned] = useState(null)
  // First client render reuses the prerendered markup already in the page, so
  // hydration matches exactly; after mount the live chart replaces it.
  const [ssr] = useState(() =>
    typeof document !== 'undefined' && document.getElementById('chart-ssr') ? document.getElementById('chart-ssr').innerHTML : ssrSvg({ devices, metric, labels, scale }),
  )

  useEffect(() => {
    const ro = new ResizeObserver(([e]) => setWidth(Math.round(e.contentRect.width)))
    ro.observe(wrap.current)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    if (!width) return
    const fig = buildChart({ devices, metric, labels: labels && width > 560, scale, width, height: heightFor(width), document })
    host.current.replaceChildren(fig)
    setPlot(fig)
    setHover(null)
    setPinned(null)
  }, [devices, metric, labels, scale, width])

  const pts = useMemo(() => {
    if (!plot) return []
    const x = plot.scale('x'), y = plot.scale('y')
    return devices.map((d) => ({ d, px: x.apply(d.t), py: y.apply(valueOf(d, metric)) }))
  }, [plot, devices, metric])

  const nearest = (e) => {
    const r = host.current.getBoundingClientRect()
    const mx = e.clientX - r.left, my = e.clientY - r.top
    let best = null, bd = 22 * 22
    for (const p of pts) {
      const dd = (p.px - mx) ** 2 + (p.py - my) ** 2
      if (dd < bd) (bd = dd), (best = p)
    }
    return best
  }

  const onMove = (e) => {
    if (e.pointerType !== 'mouse' || pinned) return
    setHover(nearest(e))
  }
  const onUp = (e) => {
    const p = nearest(e)
    setPinned(p)
    setHover(null)
    if (p) window.dhAnalytics?.track('Device open', { id: p.d.id, metric })
  }

  const focus = pinned ?? hover
  const linePts = focus ? pts.filter((p) => p.d.series === focus.d.series).sort((a, b) => a.px - b.px) : []
  const W = width ?? SSR_WIDTH
  const pos = focus ? { left: Math.min(Math.max(focus.px + 14, 0), W - 280), top: Math.max(focus.py - 20, 0) } : null
  if (pos && focus.px + 14 + 280 > W) pos.left = Math.max(0, focus.px - 294)

  return (
    <div className="chartwrap" ref={wrap}>
      {!plot && <div id="chart-ssr" className="chart" dangerouslySetInnerHTML={{ __html: ssr }} />}
      <div
        className="chart"
        ref={host}
        onPointerMove={onMove}
        onPointerLeave={() => !pinned && setHover(null)}
        onPointerUp={onUp}
      />
      {focus && (
        <svg className="overlay" width={W} height={heightFor(W)}>
          <polyline points={linePts.map((p) => `${p.px},${p.py}`).join(' ')} fill="none" stroke={C.rust} strokeOpacity="0.55" strokeWidth="1" />
          {linePts.map((p) => (
            <circle key={p.d.id} cx={p.px} cy={p.py} r="2" fill={C.rust} />
          ))}
          <circle cx={focus.px} cy={focus.py} r={W < 560 ? 5 : 7.5} fill="none" stroke={C.rust} strokeWidth="1.5" />
        </svg>
      )}
      {focus && <Popover d={focus.d} metric={metric} pos={pos} pinned={!!pinned} onClose={() => setPinned(null)} />}
    </div>
  )
}
