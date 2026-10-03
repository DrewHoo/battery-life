// What the page knows about lines, categories and evidence. The payload is
// built by scripts/data/build-payload.mjs; this file only labels it.
import payload from '../data/payload.json'

export const LINES = {
  iphone: { label: 'iPhone', brand: 'Apple', category: 'phone' },
  'galaxy-s': { label: 'Galaxy S', brand: 'Samsung', category: 'phone' },
  pixel: { label: 'Pixel', brand: 'Google', category: 'phone' },
  ipad: { label: 'iPad', brand: 'Apple', category: 'tablet' },
  'ipad-pro': { label: 'iPad Pro', brand: 'Apple', category: 'tablet' },
  'apple-watch': { label: 'Apple Watch', brand: 'Apple', category: 'watch' },
  'galaxy-watch': { label: 'Galaxy Watch', brand: 'Samsung', category: 'watch' },
  'macbook-air': { label: 'MacBook Air', brand: 'Apple', category: 'laptop' },
  'macbook-pro': { label: 'MacBook Pro', brand: 'Apple', category: 'laptop' },
  'xps-13': { label: 'XPS 13', brand: 'Dell', category: 'laptop' },
  'x1-carbon': { label: 'X1 Carbon', brand: 'Lenovo', category: 'laptop' },
}

export const CATEGORIES = [
  ['all', 'every device', 'everything'],
  ['phone', 'phones', 'phones'],
  ['tablet', 'tablets', 'tablets'],
  ['watch', 'watches', 'watches'],
  ['laptop', 'laptops', 'laptops'],
]
export const BRANDS = ['all', 'Apple', 'Samsung', 'Google', 'Dell', 'Lenovo']
export const METRICS = [
  ['h', 'battery life'],
  ['wh', 'battery capacity'],
]

// Capacity evidence: a label, Apple's or Google's transport sheet, the
// maker's spec page or a teardown's label reading is strong; an aggregator,
// a press table or a mAh x V derivation is weak.
export const STRONG_TIERS = new Set(['transport', 'manufacturer', 'teardown'])
export const GRADE_WORDS = {
  A: 'Notebookcheck Wi-Fi browsing at 150 nits',
  B: 'third-party browsing test at a fixed brightness',
  C: 'third-party browsing test, brightness not fixed',
  D: "manufacturer's claim",
}
export const TIER_WORDS = {
  transport: "maker's battery shipping sheet",
  'transport-shared': "maker's shipping sheet (model number spans years)",
  manufacturer: "maker's spec page",
  teardown: 'teardown',
  'oem-part': 'genuine part listing',
  aggregator: 'spec aggregator',
  press: 'press',
  derived: 'mAh × volts, both sourced',
  aftermarket: 'aftermarket part',
}

export const DEVICES = payload.devices
  .filter((d) => d.date && LINES[d.line])
  .map((d) => ({ ...d, t: Date.parse(d.date + 'T00:00:00Z'), brand: LINES[d.line].brand }))
export const GENERATED = payload.generated

export function select({ metric, cat, brand }) {
  return DEVICES.filter(
    (d) =>
      (cat === 'all' || d.category === cat) &&
      (brand === 'all' || d.brand === brand) &&
      // Watches have no comparable runtime test; their claims live elsewhere.
      (metric === 'wh' ? d.wh != null : d.category !== 'watch' && d.runtime != null),
  )
}

export const valueOf = (d, metric) => (metric === 'wh' ? d.wh : d.runtime?.value)
export const strongOf = (d, metric) => (metric === 'wh' ? STRONG_TIERS.has(d.whSrc?.tier) : d.runtime?.grade === 'A' || d.runtime?.grade === 'B')
