// URL <-> state helpers. Read the URL only after mount (in a useEffect), never
// during render: the prerender runs without a window, and seeding state from
// the URL during render hydrates into a mismatch when the param is set.

export function readParam(key) {
  try {
    return new URLSearchParams(window.location.search).get(key)
  } catch {
    return null
  }
}

// One replaceState per change, not pushState: changing a filter should not
// grow the back stack. The analytics embed counts each call as a pageview.
export function writeParams(params) {
  try {
    const url = new URL(window.location.href)
    for (const [k, v] of Object.entries(params)) {
      if (v == null || v === '') url.searchParams.delete(k)
      else url.searchParams.set(k, v)
    }
    window.history.replaceState(null, '', url)
  } catch {}
}
