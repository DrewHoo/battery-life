// "Show battery life for every device from every brand." Every word that can
// change is a Radix dropdown, the same pattern as cfb-streak-king.
import * as DM from '@radix-ui/react-dropdown-menu'
import { BRANDS, CATEGORIES, METRICS } from './lib/model.js'

const Caret = () => (
  <svg width="9" height="9" viewBox="0 0 10 10" aria-hidden="true">
    <path d="M1.5 3.5 5 7l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
  </svg>
)

function Word({ label, options, value, onPick }) {
  return (
    <DM.Root modal={false}>
      <DM.Trigger asChild>
        <button className="pick">
          {label}
          <Caret />
        </button>
      </DM.Trigger>
      <DM.Portal>
        <DM.Content className="menu" sideOffset={6} collisionPadding={12} loop>
          {options.map(([v, text]) => (
            <DM.Item key={v} className={'mi' + (v === value ? ' on' : '')} onSelect={() => onPick(v)}>
              <span>{text}</span>
              {v === value && <span className="mi-check">✓</span>}
            </DM.Item>
          ))}
        </DM.Content>
      </DM.Portal>
    </DM.Root>
  )
}

export default function Sentence({ metric, cat, brand, on }) {
  const cats = CATEGORIES.filter(([c]) => !(metric === 'h' && c === 'watch'))
  return (
    <p className="sentence">
      <Word label={METRICS.find(([m]) => m === metric)[1]} options={METRICS} value={metric} onPick={on.metric} />
      <span>of</span>
      <Word label={CATEGORIES.find(([c]) => c === cat)[1]} options={cats.map(([c, , t]) => [c, t])} value={cat} onPick={on.cat} />
      <span>from</span>
      <Word
        label={brand === 'all' ? 'every brand' : brand}
        options={BRANDS.map((b) => [b, b === 'all' ? 'every brand' : b])}
        value={brand}
        onPick={on.brand}
      />
    </p>
  )
}
