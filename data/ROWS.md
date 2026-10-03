# Row format

Facts are rows. One row per (device, field, source). Research agents write one file per line and pass: `data/rows/specs/<line>.json`, `data/rows/runtime/<line>.json`. Bulk parsers write `data/rows/bulk/*.json`. Nothing else edits these files by hand; fixes go in `data/ref/corrections.json`.

```json
{
  "line": "iphone",
  "devices": [
    { "id": "iphone-15-pro-max", "line": "iphone", "category": "phone", "name": "iPhone 15 Pro Max",
      "variant": "Pro Max", "generation": "15", "modelNumbers": ["A2849", "A3105", "A3106", "A3108"],
      "googleName": null, "note": null }
  ],
  "rows": [
    { "device": "iphone-15-pro-max", "field": "release_date", "value": "2023-09-22", "kind": "released",
      "url": "https://www.apple.com/newsroom/...", "archiveUrl": null,
      "quote": "available beginning Friday, September 22", "retrieved": "2026-10-03" }
  ],
  "rejections": [
    { "device": "iphone-15-pro-max", "field": "capacity_wh", "note": "no iFixit teardown guide; GSMArena gives mAh only" }
  ]
}
```

## Rules

- `quote` is copied verbatim from the page text, long enough to be unambiguous and to contain the value (and the device name when the page covers several). `node scripts/verify-quotes.mjs <file>` must pass before a file is done.
- Fetch every page with `node scripts/fetch-page.mjs <url> [--wayback=yyyymmdd] --grep <text>`. It caches the page under `data/raw/pages/`, which is what verify-quotes reads. A page you read some other way (WebFetch, browser) doesn't count, because its quote can't be checked.
- If the page came from the Wayback Machine, `url` is the original URL and `archiveUrl` is the `fetchedUrl` that fetch-page printed.
- A value you can't find gets a rejection, not a guess. Null beats wrong.
- Multiple sources for the same field are good: add a row for each. Code picks which one displays.

## Device ids

`<line>-<slug>`, lowercase, hyphens: `iphone-3gs`, `iphone-15-pro-max`, `galaxy-s-s8-plus`, `pixel-9-pro-xl`, `ipad-air-2`, `ipad-pro-12-9-gen3`, `apple-watch-s3-38-cell`, `galaxy-watch-6-classic-47`, `macbook-air-13-2020-m1`, `macbook-pro-16-2019`, `xps-13-9350`, `x1-carbon-gen-6`. A device is one battery: when variants of a model ship different batteries (GPS vs cellular watch, Touch Bar vs not, 51 vs 55 Wh laptop pack), they are separate devices.

## Fields

| field | value | unit | kind / extra keys |
| --- | --- | --- | --- |
| `model_number` | "A2849" | | one row per number |
| `release_date` | "2023-09-22" | | kind: `announced` \| `released` |
| `launch_price_usd` | 999 | USD | `note`: config, e.g. "128GB" |
| `capacity_wh` | 17.32 | Wh | |
| `capacity_mah` | 4422 | mAh | kind: `rated` \| `typical` |
| `voltage_v` | 3.88 | V | nominal voltage of this battery |
| `display_in` | 6.7 | in | |
| `resolution_px` | "2796x1290" | | long side first |
| `panel` | "OLED" | | LCD, OLED, mini-LED, … as the source says |
| `refresh_hz` | 120 | Hz | max |
| `brightness_nits` | 1000 | nits | kind: `typical` \| `peak_hdr` \| `peak_outdoor` \| `measured` (third-party measured max) |
| `height_mm`, `width_mm`, `depth_mm` | 159.9 | mm | |
| `weight_g` | 221 | g | `note` when variants differ ("aluminum", "Wi-Fi") |
| `soc` | "A17 Pro" | | one row per regional chip |
| `process_nm` | 3 | nm | |
| `charging_w` | 27 | W | max wired rate as stated; skip if only an adapter is stated |
| `runtime_h` | 15.83 | h | runtime pass only, see below |
| `claimed_runtime_h` | 6 | h | manufacturer; kind: `internet_wifi` \| `video` \| `daily_use` |

Runtime rows (`runtime_h`) also carry `outlet` (`notebookcheck`, `anandtech`, `gsmarena`, `laptopmag`, `tomshardware`, `tomsguide`), `raw` ("15h 50min"), `testDate` (review publish date), `brightnessNits` (as stated, null if not), `network` (`wifi` \| `lte` \| `5g`), and `protocolQuote` (the page's own sentence about brightness/workload, when there is one; verify-quotes checks it too). Code assigns the grade from `data/ref/grades.json`; agents don't.
