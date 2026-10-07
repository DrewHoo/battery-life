// Writes the chart's brand marks to public/icons/<brand>-<tone>.svg.
// Run after changing src/lib/brands.js; the outputs are committed.
import { mkdirSync, writeFileSync } from 'node:fs'
import { brandSvg, ICON_COLORS, iconFile } from '../src/lib/brands.js'

mkdirSync('public/icons', { recursive: true })
for (const brand of ['Apple', 'Google', 'Samsung', 'Dell', 'Lenovo'])
  for (const [tone, color] of Object.entries(ICON_COLORS)) writeFileSync(`public/icons/${iconFile(brand, tone)}`, brandSvg(brand, color))
console.log('wrote', 10, 'icons to public/icons/')
