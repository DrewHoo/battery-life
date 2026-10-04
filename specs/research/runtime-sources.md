# Runtime sources

Research pass, 2026-10-03. Which outlets run a battery runtime test with a stated protocol, for how long, and whether the pages are fetchable now.

## Findings

- Notebookcheck's Wi-Fi browsing test at ~150 cd/m² is the only protocol one outlet runs on phones, tablets and laptops alike.
- It starts mid-2012. The MacBook Air Mid-2012 review (Aug 2012) and the iPhone 5 review (Sep 2012) state 150 cd/m². Before that, "Surfing with WLAN" ran at whatever brightness the reviewer chose.
- Notebookcheck live returns a Cloudflare 403 to curl and WebFetch. Wayback works for 2009–2024 captures. Use the CDX API (`web.archive.org/cdx/search/cdx?url=…`); `wayback/available` returned empty for pages CDX had.

## Outlets

| Outlet | Categories | Protocol | Brightness | Years | Fetchability | Result form |
|---|---|---|---|---|---|---|
| Notebookcheck | phone, tablet, laptop | scripted pages over Wi-Fi; 40 s per page 2012–13, 30 s after script v1.3 (2015-03-05) | ~150 cd/m² | mid-2012 →; uncontrolled brightness 2009–2012 | live 403; Wayback works | text box, e.g. "WiFi Websurfing (Safari Mobile 16) 13h 27min" |
| AnandTech (closed 2024) | phone, tablet, laptop | pages at a fixed interval, Wi-Fi/3G/LTE; scrolling added 2016 | 200 nits ("as always" in 2012); 2008 "approximately 50%" | 2007 → ~2024 | domain 301s to forums; Wayback works | mostly chart images |
| GSMArena | phone, some tablets | v1 page reload every 10 s; v2 (Nov 2023) scroll every 3 s; Wi-Fi | 200 nits | 2012 → | live 200 | HTML table at `battery-test.php3` (~1,000 phones) |
| Tom's Guide | phone (cellular); laptop/tablet on Wi-Fi | continuous web surfing | 150 nits | phones on LTE confirmed Sept 2014; 5G now | live 200 | prose, roundup tables |
| Laptop Mag | laptop, tablet, phone | web surfing on Wi-Fi (phones on LTE) | 150 nits since 2018-02-01; 100 before; phones "40 percent" in 2013 | ~2010 → | live 200 | prose |
| Tom's Hardware | laptop | web browsing over Wi-Fi | 150 nits | start not pinned | live 200 | prose, chart |
| PhoneArena | phone | browsing/video/gaming, "Battery Score" since 2023 | 200 nits at start (2012) | 2012 → | live 403; Wayback works | widget |
| DXOMARK | phone | robot mixed-use day | 200 cd/m² | 2019 → | live 200 | scores |
| PCMag | phone, tablet, laptop | video streaming / loop | phones and tablets at max; laptops 50% | ongoing | curl 200 | prose |

Ruled out: Wirecutter, Engadget, The Verge (no stable protocol), PCMag phones/tablets (max brightness isn't normal use), CNET (no phone protocol found), DXOMARK (phones only, 2019+), LTT Labs (bot-walled, worth a manual read).

## Methodology quotes

- Notebookcheck (captured 2024-12-08, notebookcheck.net/How-does-Notebookcheck-test-laptops-and-smartphones-A-behind-the-scenes-look-into-our-review-process.15394.0.html): "WLAN operation: Achievable runtime in WLAN operation with adjusted display brightness (~150 cd/m²) and activated power-saving measures (power profile Balanced or similar). For the run time test, an automatic script (updated on 05.03.2015 to v1.3 with HTML5, javascript, and no flash) is executed, which calls up a mix of Internet pages that change constantly every 30s."
- Notebookcheck iPhone 5 review, Sep 2012 (…Review-Apple-iPhone-5-Smartphone.82176.0.html): "our Wi-Fi surfing-test employs a display brightness of 150 cd/m2 and cycles through different websites automatically at 40 second intervals."
- AnandTech iPhone 5 review (anandtech.com/show/6330/the-iphone-5-review/13): "we regularly load web pages at a fixed interval until the battery dies (all displays are calibrated to 200 nits as always)."
- AnandTech iPhone 3G review (anandtech.com/show/2571/18): "the iPhone's brightness was set to approximately 50%." Result: "WiFi continues to take the cake at 6 hours and 40 minutes."
- GSMArena v1 (gsmarena.com/gsmarena_lab_tests-review-751p6.php): "an automated script that reloads a webpage every ten seconds", "a fixed brightness level of 200nits".
- GSMArena v2 (gsmarena.com/how_we_test_gsmarena_battery_test_v2-news-60429.php): "Brightness is set to 200nits."
- Tom's Guide (tomsguide.com/reference/how-toms-guide-tests-and-reviews-smartphones): "Each phone's screen is set to 150 nits of brightness, and then we have the fully charged phone surf the web over cellular (5G in the case of 5G-capable devices)…"
- Laptop Mag (laptopmag.com/articles/laptop-testing-changes-2018): "As of February 1st, 2018, Laptop Battery Test 2.0…"
- Apple, original iPhone (support.apple.com/en-us/112445): "Internet use: Up to 6 hours"; footnote: "Internet over Wi-Fi testing conducted using a closed network and dedicated web and mail server, simulating browsing to 20 popular URLs".

## Pre-2012 gap

No calibrated-brightness browsing test exists for phones before ~2011–12. AnandTech tested the original iPhone in 2007 (chart image only), the iPhone 3G at ~50% brightness (prose), and the 3GS (table: Wi-Fi browsing 8.83 h). Notebookcheck's 2009–mid-2012 WLAN results have no stated brightness (original iPad 9h23m). GSMArena's table starts with 2012 phones; its earliest iPhone is the 4s.

## Watches

No comparable third-party test exists. Notebookcheck wears watches 24 h/day with all functions on (Galaxy Watch Ultra: "48 hours"). Wareable records "several cycles". DC Rainmaker is anecdotal. One-off screen-on lab tests exist (Apple Watch Ultra 3, 31h55m at 25% brightness) but nobody runs them consistently. Apple's "18 hours of normal daily use" claims, with footnoted test conditions, are the only consistent series.

## Checked during the runtime pass

- Notebookcheck's German edition (notebookcheck.com) serves every review live with HTTP 200, while notebookcheck.net is Cloudflare-walled and Wayback rate-limits this IP into connection refusals. The German reviews come from the same lab; their result boxes read "WiFi Websurfing (…)" or, before 2015, "Surfen über WLAN". Its "Specs und Testsammlung" series pages link every in-house review.
- The iPhone 17 Pro's 24h 14min (vs the 16 Pro's 16h 23min, +48%) is not a protocol change: the review's own comparison table lists the 16 Pro at 16.4 h and 2025 Android flagships at 22–25 h (Galaxy S25 Ultra 22.2, Honor Magic7 Pro 24.7) under the same "WLAN (h)" heading.
- Notebookcheck's pre-mid-2012 WLAN runs were often at maximum brightness (MacBook Air 2008–2011, the 15" MacBook Pro Late 2011) or half brightness (original iPad). They grade C.
- Some Notebookcheck results were extrapolated from a partial run (iPad Air, iPad 3: "hochgerechnet"). Those aren't runs to shutdown and aren't used.
