# battery-life v1 spec

Two charts over 2007–2026: how much battery mobile devices carry (Wh), and how long that battery lasts under one fixed definition of normal use (hours). Four categories: phones, tablets, watches, laptops. Every point links to the line in a source that proves it. Hosting follows the dataviz-pages-site pattern at drewhoover.com/battery-life/, styled after cfb-streak-king, charts drawn with Observable Plot.

The research behind this is in [research/capacity-sources.md](research/capacity-sources.md) and [research/runtime-sources.md](research/runtime-sources.md).

Nobody has this. Existing charts are mAh-only, single-category or single-brand, and mix Samsung's "typical" mAh with everyone else's rated mAh. LTT Labs' 2026 meta-analysis puts iPads and phones on one mAh axis and only goes back to July 2025. Eclectic Light charts Wh, but for Macs only.

## Roster

The fixed list is flagship lines, every generation, every size variant. Research targets this list; nothing outside it gets researched.

| category | lines | first |
| --- | --- | --- |
| phone | iPhone (numbered, Plus, mini, Pro, Pro Max, Air), Galaxy S (base, +, Ultra, Edge), Pixel (base, XL, Pro, Pro XL) | 2007, 2010, 2016 |
| tablet | iPad (base), iPad Pro (every size) | 2010, 2015 |
| watch | Apple Watch (Series, Ultra; both sizes), Galaxy Watch (incl. Classic, Ultra) | 2015, 2018 |
| laptop | MacBook Air, MacBook Pro (13/14/15/16), Dell XPS 13, ThinkPad X1 Carbon | 2008, 2008, 2012, 2012 |

That's roughly 300 devices. Budget lines (iPhone SE, Pixel a, Galaxy FE, Apple Watch SE) are out of v1. MacBook Pro starts at the 2008 unibody so the laptop lines share a start year. A laptop line with several battery options per generation (XPS 13 with 51/52/55 Wh packs) gets one row per pack. A laptop row records which display config was tested, because a 4K panel can cost a third of the runtime.

`data/roster.json` holds one row per device: id, line, category, name, variant, release date, and model numbers (Apple A-numbers, Samsung SM- numbers). The release date carries a receipt like every other field.

## Normal use

Normal use is continuous web browsing over Wi-Fi at ~150 nits from a full charge until the device shuts off. This is Notebookcheck's WLAN test, and it's the only protocol one outlet runs on phones, tablets and laptops alike. Notebookcheck has run it at 150 cd/m² since mid-2012 (MacBook Air Mid-2012, iPhone 5). The script's page interval went from 40 s to 30 s in March 2015 and the browser changes with every review. That drift is small next to the differences between outlets, so v1 treats 2012–2026 as one series.

Brightness matters more than it looks. A 200-nit result is not comparable to a 150-nit one, and we don't correct one into the other. So other outlets' numbers sit in their own evidence grade instead of being folded in.

Runtime evidence grades:

| grade | what | example |
| --- | --- | --- |
| A | Notebookcheck WLAN at ~150 cd/m²: the review states 140–170 cd/m², or it's from Aug 2012 on, when the protocol was standard | "WiFi Websurfing (Safari Mobile 16) 13h 27min" |
| B | another third-party browsing test at a calibrated brightness: AnandTech or GSMArena at 200 nits, Laptop Mag or Tom's Hardware at 150, Tom's Guide at 150 on cellular | AnandTech iPhone 5, 200 nits |
| C | a third-party browsing test at another or unstated brightness: AnandTech 2007–2011, Notebookcheck before mid-2012 (often run at maximum brightness) | AnandTech iPhone 3G, "approximately 50%" |
| D | a manufacturer "up to" claim with a browsing workload | "Internet use: Up to 6 hours" (original iPhone) |

When a device has several results at its best grade, phones and tablets show the median. Laptops show the longest-running tested config: Notebookcheck often reviewed one model with two or three panels, and the panel moves runtime up to 2x (X1 Carbon Gen 10: 5h 00m OLED, 10h 10m IPS), so a median describes no real machine. The popover lists the other configs. Only Notebookcheck's v1.3 script counts once it existed (2015-03-05); a review that also reports the old script loses that row through `data/ref/corrections.json`.

The runtime chart plots A by default. B through D render as recessive marks and are labeled in the popover. A device gets its best available grade as its point, and every other candidate stays in the data. Where a device has both an A and a D (2012 onward), the coverage report computes measured ÷ claimed per brand, which tells the reader how far to trust the D-only years.

Watches don't fit this definition. No outlet runs a consistent watch runtime test; reviewers wear them for a day or two and report "48 hours". So watches appear on the capacity chart and get their own runtime view built from manufacturer claims (Apple's "18 hours of normal daily use" with its footnoted usage mix), clearly labeled D. Putting a watch's mixed-use hours on the same axis as a phone's screen-on hours would be a lie.

## Capacity

Capacity is watt-hours. mAh isn't comparable across a 3.85 V phone cell and an 11.4 V laptop pack.

Source rank, highest first: battery label photo or UN38.3 transport sheet > manufacturer spec page > teardown text > aggregator (GSMArena, Notebookcheck, Wikipedia). Every candidate gets stored. The rank picks which one displays.

- Apple's APIS sheet (the UN38.3 transport document, chemtrec.blob.core.windows.net/criterion/APIS_BPIS_Current.pdf) has Wh for every Apple product manufactured after 2010-01-01, keyed by A-number. A script parses it. No agent touches it.
- Google's UN38.3 page (support.google.com/store/answer/9682653) does the same for Pixel and Pixel Watch. Also parsed by a script.
- APIS has typos. "A1332 iPhone 4 … 0.525" is 5.25 Wh with a misplaced decimal, and the 38 mm Watch Series 0 copies the 42 mm value. So a UN38.3 value only displays when a second source agrees within 3%, or when no second source exists and it passes the plausibility check below.
- APIS keys rows by model number and its descriptions are unreliable (it calls A1502, a 13" MacBook Pro, "MacBook Air 13-inch with Retina display"). So the join goes roster model numbers → APIS rows, never APIS description → device.
- Among the top-ranked capacity candidates, the one the other sources agree with (within 3%) displays. APIS lists one iPhone X model number at 6.91 Wh against 10.35 for its siblings, and the siblings plus the teardown outvote it. Ties go to the lower value, which covers models with batteries from two suppliers.
- iPhone 18 Pro Max model numbers appear twice in APIS: a plain row at 19.79 Wh and an "(after activation)" row at 21.751 Wh marked "SI" (Section I air freight, the class for batteries over 20 Wh). Our reading: the battery ships held under the 20 Wh line and unlocks its full rating on activation. Apple doesn't say this anywhere we've found. The after-activation row is the device's capacity.
- APIS's Wh Rating is per battery. A two-battery product (the iPhone Duo foldable) holds Wh × batteries per product.
- mAh converts to Wh only when the nominal voltage has its own receipt for the same battery (label, UN38.3 sheet, filing, or teardown of that model). The row is flagged `derived` and carries both receipts. We never impute a category-default voltage (a 3.7 vs 3.89 V guess moves a phone 5%), and never take one from an aftermarket part listing. No sourced voltage means the device lands on a "mAh only" list instead of the chart.
- Rated mAh, not typical. Samsung's spec pages lead with typical ("4000") and footnote rated ("Rated capacity is 3885 mAh for Galaxy S25").
- A Wikipedia number counts only if its own citation contains it. The iPhone 16 article's Wh cites a page that only has mAh.

## Other fields

Captured now, charted later. They come off the same spec pages, so collecting them costs little.

| field | note |
| --- | --- |
| display diagonal (in), resolution (px), panel type, max refresh (Hz) | laptops record the tested panel |
| brightness (nits) | stored with a kind: `typical`, `peak_hdr`, `peak_outdoor`, `measured`. These are different numbers and never share a column |
| dimensions H×W×D (mm), weight (g) | weight records the variant (aluminum vs steel watch, Wi-Fi vs cellular iPad) |
| SoC and process node (nm) | Samsung regional splits get both chips |
| max wired charging (W) | actual rate, not adapter rating; null when only the adapter is stated |
| launch date, launch price (USD, base config) | launch price, not street price |

## Data model

Facts are rows, not columns on the device. One row per (device, field, source):

```
{ device, field, value, unit, kind?, grade, url, archiveUrl?, quote, retrieved }
```

`quote` is the verbatim line from the page. `scripts/verify-quotes.mjs` string-matches every quote against the cached page and rejects rows that fail. Pages cache under `data/raw/pages/` (gitignored, keyed by URL hash). Notebookcheck 403s live, so its pages come from the Wayback Machine via the CDX API, and the row keeps both URLs.

Judgment lives in versioned files, not in agents:

- `data/ref/source-rank.json`: the capacity and runtime source ranks above.
- `data/ref/grades.json`: outlet + stated brightness + date + network → runtime grade, plus the same-grade pick rule (median, or longest config for laptops). A rule change re-grades the whole dataset.
- `data/ref/corrections.json`: evidence-backed patches and exclusions applied before the pick (the APIS iPhone 4 decimal). Each entry cites its receipt.

`scripts/build-payload.mjs` joins roster + rows + rules into `src/data/payload.json`: one picked value per (device, field) plus the alternates.

## Coverage report

`scripts/coverage-report.mjs` runs after every merge and prints suspects, not counts.

- Quote verification: every displayed row's quote matches its cached page.
- Capacity agreement: any two Wh candidates for a device more than 3% apart. This catches the APIS decimal typos.
- Capacity plausibility: Wh outside a per-category band (watch 0.1–2, phone 3–25, tablet 15–60, laptop 25–100), and mAh × V vs stated Wh off by more than 3% (Notebookcheck's XPS 13 "52 Wh … 7.4V 6930 mAh" is 51.3).
- Variant consistency: devices sharing a battery part number with different Wh.
- Runtime vs claim: measured ÷ claimed outside 0.4–1.6.
- Coverage holes: per line and year, which devices have no capacity and which have no A-grade runtime.
- Known answers, which fail the build: iPhone 16 = 13.839 Wh (APIS A3288), MacBook Air 2008 = 37 Wh (Apple spec page via Wayback), Galaxy S8 = 11.55 Wh, original iPhone claim = 6 h internet. A Notebookcheck A-grade known answer gets added once the fleet confirms one against the cached page.

## Research fleet

Code does the bulk parsing (APIS, Google's sheet, GSMArena's battery table). Agents gather the rest. Batched by line, not alphabetically. Every agent gets the existing rows for its line, so it doesn't report them back.

1. Roster: one agent per line. Model list, release dates and model numbers with receipts, from Apple's "identify your iPhone/iPad/Mac/Watch" pages and manufacturer newsrooms.
2. Specs and capacity: one agent per line. Spec-page fields, teardown Wh and voltages for devices the bulk sheets don't cover (pre-2010 Apple, Samsung, Dell, Lenovo).
3. Runtime: one agent per line, Notebookcheck first (Wayback), then the grade B/C/D fallbacks.

Every agent caches what it fetched to `data/raw/pages/` under its own subdirectory, returns rejections along with rows ("checked, no 150-nit test exists for this device"), and returns null rather than a guess. Expected size: 11 lines × 3 passes, run as ~11 agents per pass.

## Page

Same look as cfb-streak-king: dark warm page, cream ink, rust reserved for data, Graduate / Source Serif / IBM Plex Mono, paper grain. One italic sentence of setup, then the chart.

- Chart 1: capacity (Wh, log y, 0.1–100) over release date. One mark per device, shape or tone by category, lines drawn through each flagship line's base model.
- Chart 2: hours of normal use over release date, phones / tablets / laptops. Grade A solid, B–D recessive.
- Controls are a sentence like cfb-streak-king's: "Show **battery life** for **phones** from **all brands**." Every word is a menu and every choice goes in the URL.
- A popover on each point shows the device, the value, its grade, and the quote linked to its source. The chart itself never grows labels.
- Plot renders server-side in `scripts/prerender.mjs` (Plot takes a `document` option), so the deployed HTML has the SVG in it and the client attaches interactivity after hydration.

Later, out of v1: hours per Wh (efficiency), brightness and screen area vs runtime, the watch runtime view if a consistent test turns up, budget lines.

## Open questions

- Should the base-model lines on chart 1 include Pro Max-style variants as their own line, or only base models? Starting with base models.
- Grade B mixes 150 and 200 nits. Maybe 150-nit outlets should be their own grade? Starting with one B.
