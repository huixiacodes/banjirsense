// Vercel serverless function: GET /api/jps
// Fetches live river levels from JPS Public InfoBanjir, keeps fresh water-level
// stations, and returns a compact JSON the browser can read (JPS itself sends
// no CORS header, so the site can't call it directly).
//
// Data © Jabatan Pengairan dan Saliran Malaysia (JPS) — publicinfobanjir.water.gov.my
// This is an unofficial feed; the JPS site is the authoritative source.

const SOURCE = 'https://publicinfobanjir.water.gov.my/wp-content/themes/enlighten/data/latestreadingstrendabc.json'
const MAX_AGE_HOURS = 6
const CACHE_MS = 2 * 60 * 1000

const STATE_IDS = {
  JOHOR: 'jhr', KEDAH: 'kdh', KELANTAN: 'ktn', MELAKA: 'mlk', 'NEGERI SEMBILAN': 'nsn', PAHANG: 'phg',
  PERAK: 'prk', PERLIS: 'pls', 'PULAU PINANG': 'png', SARAWAK: 'swk', SELANGOR: 'sgr', TERENGGANU: 'trg',
  'WILAYAH PERSEKUTUAN KUALA LUMPUR': 'kul', SABAH: 'sbh', 'WILAYAH PERSEKUTUAN LABUAN': 'lbn',
  'WILAYAH PERSEKUTUAN PUTRAJAYA': 'pjy',
}
const STATUS = { normal: 'NORMAL', alert: 'ALERT', warning: 'WARNING', danger: 'DANGER' }

// "18/11/2026 19:45" in Malaysia time (UTC+8) -> epoch ms
function parseMyt(s) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})/.exec(s || '')
  if (!m) return null
  return Date.UTC(+m[3], +m[2] - 1, +m[1], +m[4] - 8, +m[5])
}

// "Sg. Klang di Taman Sri Muda" -> "Taman Sri Muda"
const townOf = (name) => (/\s(?:di|Di|DI)\s(.+)$/.exec(name)?.[1] ?? name).replace(/\s*\((F\d|RHN)\)\s*$/i, '').trim()

let cache = { at: 0, body: null }

async function load() {
  if (cache.body && Date.now() - cache.at < CACHE_MS) return cache.body
  const res = await fetch(SOURCE, { headers: { 'User-Agent': 'BanjirSense-prototype' } })
  const text = await res.text()
  let rows
  try {
    rows = JSON.parse(text)
  } catch {
    // During maintenance JPS answers 200 with an HTML "Notis Gangguan" page.
    throw new Error('JPS feed unavailable (maintenance page or invalid JSON)')
  }
  const now = Date.now()
  const stations = []
  for (const r of rows) {
    if (!String(r.i).includes('WL')) continue
    const status = STATUS[String(r.n).trim().toLowerCase()]
    const level = parseFloat(r.m)
    const lat = parseFloat(r.c)
    const lng = parseFloat(r.d)
    const updated = parseMyt(r.q)
    if (!status || !Number.isFinite(level) || level <= -8888 || !lat || !lng || !updated) continue
    if (now - updated > MAX_AGE_HOURS * 3600e3) continue
    stations.push({
      id: String(r.a).trim(),
      name: String(r.b).trim(),
      town: townOf(String(r.b).trim()),
      river: String(r.g || r.h).trim(),
      basin: String(r.h).trim(),
      district: String(r.e).trim(),
      state: STATE_IDS[String(r.f).trim()] ?? null,
      lat,
      lng,
      level,
      status,
      trend: String(r.s || '').trim() || null,
      updated,
    })
  }
  const body = JSON.stringify({ source: 'JPS Public InfoBanjir', fetchedAt: now, count: stations.length, stations })
  cache = { at: now, body }
  return body
}

// Plain Node (req, res) handler: works on Vercel and inside Vite's dev server.
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  try {
    const body = await load()
    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    // Vercel's CDN keeps it for 5 min, then serves stale while refreshing.
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600')
    res.end(body)
  } catch (err) {
    res.statusCode = 502
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.setHeader('Cache-Control', 'no-store')
    res.end(JSON.stringify({ error: err.message }))
  }
}
