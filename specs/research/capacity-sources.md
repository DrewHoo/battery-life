# Capacity (Wh) sources

Research pass, 2026-10-03. Raw pages and a machine-readable `receipts.json` lived in the session scratchpad; the receipts that matter are quoted here.

## Findings

- Apple publishes Wh for Macs and iPads. It never publishes Wh for iPhone or Apple Watch: both spec pages list runtime hours only, and since June 2025 the iPhone numbers come from EU energy labels, which give mAh only.
- Wikipedia's iPhone Wh values don't trace to a source. The iPhone 16 article says "13.84 Wh (3561 mAh) Li-ion @ 3.89 V", but its citation (9to5Mac via Anatel) only gives mAh.
- Samsung markets "typical" mAh. The "rated" mAh is lower and is what labels and EU filings use ("Rated capacity is 3885 mAh for Galaxy S25" vs 4000 typical).
- Early batteries don't print capacity. The original iPhone label reads "616-0290 / L1S1376APPC 3.7V".

## Sources

| Source | Categories | Years | Unit | Grade | Fetchability |
|---|---|---|---|---|---|
| Apple tech specs (apple.com/*/specs, support.apple.com/en-us/1xxxxx) | Mac, iPad | 2008–2026 | Wh | primary spec | direct; old `kb/SPxxx` ids redirect unpredictably |
| same, iPhone / Watch | phone, watch | all | hours only | n/a | direct |
| Apple environmental reports (PER PDFs) | Mac (Wh); iPhone/Watch chemistry only | 2009–2026 | Wh for Mac | primary | direct PDF |
| EU EPREL product sheets (`/api/products/smartphonestablets20231669/{id}`) | phones, slate tablets | Jun 2025+ | rated mAh, no voltage | primary regulatory | single-product JSON/PDF open; search 403 without key |
| FCC (apps.fcc.gov, fccid.io, fcc.report) | all | all | label photos sometimes | primary | 403 / Cloudflare for curl; browser only |
| Anatel (Brazil) | phones | ~2015+ | mAh | primary | login required |
| TENAA / CCC (China) | phones | all | mAh | primary | unreachable |
| Lenovo PSREF PDFs | laptops | ~2021+ searchable | Wh | primary spec | direct PDF |
| iFixit teardowns (`/api/2.0/guides/{id}`) | all | 2007–~2023 | usually Wh, often V + mAh | teardown / label photo | direct JSON API; 2024+ teardowns are mostly video |
| iFixit replacement parts | phones | – | mAh, V, sometimes Wh | secondary (aftermarket) | direct; voltages unreliable (iPhone 16 part says 3.8 V) |
| GSMArena | phone, tablet, watch | 2007–2026 | mAh, Wh sometimes | aggregator | direct |
| Notebookcheck | laptops, phones | 2008–2026 | Wh in spec table | review aggregator | 403 for curl; works in a browser |
| Wikipedia | all | all | mixed | aggregator, weak citations | direct |

## Test-device receipts

| Device | Wh | Receipt |
|---|---|---|
| iPhone (2007) | 5.18 derived | V: "It is a 3.7 volt Li-Ion Polymer battery." (ifixit.com/Teardown/iPhone+1st+Generation+Teardown/599 step 10). mAh: "Lithium Ion Polymer 1400 mAh 3.7V" (web.archive.org/web/20090207054030/http://www.ipodbatteryfaq.com/ipodbatteryandpower.html) |
| iPhone 15 | 12.98 | "Watt Hours 12.98 Wh Voltage 3.87 V Milliamp Hours 3349 mAh" (ifixit.com/products/iphone-15-battery; aftermarket) |
| iPhone 16 | 13.84 weak | Wikipedia; mAh confirmed via 9to5Mac/Anatel, voltage unsourced |
| iPad (2010) | 25 | "Built-in 25-watt-hour rechargeable lithium-polymer battery" (support.apple.com/en-us/112438); iFixit says 24.8 |
| Apple Watch 38 mm (2015) | 0.78 | "This wee 3.8 V, 0.78 Wh lithium-ion battery…" (ifixit.com/Teardown/Apple+Watch+Teardown/40655) |
| MacBook Air (2008) | 37 | "Integrated 37-watt-hour lithium-polymer battery" (web.archive.org/web/20080229134302/http://www.apple.com:80/macbookair/specs.html) |
| Galaxy S8 | 11.55 | "The Samsung-branded battery clocks in at 11.55 Wh" (ifixit.com/Teardown/Samsung+Galaxy+S8+Teardown/87136); GSMArena agrees |
| ThinkPad X1 Carbon Gen 12 | 57 | "57Wh Rechargeable Li-ion Battery" (Lenovo PSREF PDF) |
| Dell XPS 13 9343 | 52 | "four-cell, 7.4 V, 52 Wh battery" (ifixit.com/Teardown/Dell+XPS+13+Teardown/36157); Notebookcheck's own V × mAh gives 51.3 |

## Proposed mAh rule

1. Take a stated Wh as-is. Source rank: manufacturer spec/label > regulatory filing > teardown text > aggregator. Keep every candidate; display the top-ranked, keep the rest as alternates.
2. Convert mAh only when the nominal voltage has its own receipt for the same battery (label photo, filing, or teardown of that model or part number). Wh = rated mAh × V / 1000. The row is flagged `derived` and carries both receipts.
3. Never impute a category-default voltage, and never take one from a replacement-part listing. No sourced voltage means the device goes on a "mAh only" list, not the chart.
4. Rated mAh, not typical. A Samsung typical-only figure needs the rated footnote or EPREL, else it's excluded or flagged `typical`.
5. Cite a Wikipedia Wh only if its own reference contains the number.

A 3.7 vs 3.89 V guess moves a phone's Wh about 5%, so rule 3 matters.

## Prior art

- LTT Labs phone battery meta-analysis (Mar 2026): mAh vs measured runtime, phones and tablets on one mAh axis, mixes typical and rated, only devices since Jul 2025.
- Android Authority (2018, 2026): Android flagships, mAh only.
- GSMArena "Counterclockwise" (2018): mAh plus endurance rating, phones, 2010–2017.
- Macworld iPhone table: mAh + Wh, iPhone only, no per-row sources.
- Eclectic Light, "A brief history of Mac batteries" (2024): Wh, Macs only.
- Statista: mAh capacity bands, paywalled.

Nobody has one Wh axis across phones, tablets, watches and laptops, multi-brand, rated capacity, with a receipt per point.

## Dead ends

FCC (three mirrors), Anatel, TENAA/CCC and UL Demko were unusable from curl. Notebookcheck and LTT 403 curl but load in a browser. Samsung spec pages render client-side. iFixit search finds no 2024+ teardowns for iPhone 15/16 or Galaxy S24. 
## Addendum: Apple and Google transport sheets (UN38.3)

Apple publishes Wh for every product manufactured after 2010-01-01 in its Apple & Beats Product Information Sheet (APIS), the lithium-battery transport document hosted by CHEMTREC: https://chemtrec.blob.core.windows.net/criterion/APIS_BPIS_Current.pdf (last modified 2026-10-01, lists iPhone 17 and Watch Series 11). Columns are "Apple Model # | Description | Battery(s) Per Product | Cells Per Battery | Battery Weight (Kg) | Wh Rating". It is the only primary Wh source for iPhone and Apple Watch.

- "A3288 iPhone 16 1 1 .046 13.839 N UN 3481" (verified against a fresh download)
- "A2997 Series 10 GPS 1 1 .005 1.118"
- It has typos. "A1332 iPhone 4 1 1 0.025 0.525" is 5.25 Wh off by a decimal, and "A1553 Apple Watch 1st gen 38mm … 0.93" copies the 42mm value (iFixit label: 0.78 Wh). So APIS rows get cross-checked against a second source and a plausibility check, never taken alone.
- The current edition dropped some 2010 rows (iPad 1, A1219). The 2019 edition keeps them (airsafe.com.au mirror; a 2014 copy on sds.staples.com). Pre-2010 devices (2007 iPhone, 2008 MacBook Air) aren't covered.
- No voltage or mAh.

Google publishes the same kind of table for Pixel 2 onward and Pixel Watch at support.google.com/store/answer/9682653 ("Pixel 9 58.9g 17.77Wh", "Pixel Watch 4.67g 1.132Wh"). Samsung has no central page; per-model summaries turn up on distributor sites.

Revised source rank for Wh: label photo or UN38.3 sheet > manufacturer spec > teardown > aggregator.

## Addendum: secondary spec fields

| Field | Apple spec page | GSMArena | Notebookcheck | Lenovo PSREF | iFixit | Wikipedia |
|---|---|---|---|---|---|---|
| Diagonal, resolution | yes | yes | yes | yes, several panel options | rarely | yes |
| Panel type | yes | yes | yes | yes | sometimes | yes |
| Refresh rate | only when >60 Hz | recent | yes | yes | no | recent |
| Brightness | typical, HDR peak, outdoor peak, labeled | mfr typical/HBM; measured in reviews | measured cd/m² | mfr nits | no | mixed |
| Dimensions, weight | yes | yes | yes | starting weight | no | yes |
| SoC, process node | chip; node only in press releases | chip + nm | CPU | CPU | part numbers | yes |
| Max wired charging W | no (adapter only) | sometimes | adapter W | adapter W | no | mixed |
| Launch date, price | newsroom | announce date; current street price | reviewed config price | announce date | no | yes |

Sources disagree on: brightness (typical vs HDR peak vs outdoor peak vs measured), weight (case material, carrier variant, unit-conversion errors: GSMArena's Watch "40 g body (2.72 oz)"), SoC (Exynos vs Snapdragon regions), charging (adapter rating vs actual rate), price (launch vs street, which tier is base), process node (Apple rarely states it), and laptop configs (pick one and record which).
