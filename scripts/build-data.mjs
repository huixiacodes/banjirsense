// Builds the static data files the app loads at runtime:
//   public/data/states.json     simplified state outlines (lng/lat)
//   public/data/postcodes.json  every Malaysian postcode -> town, state, approx coordinates
//
// Sources (all openly licensed):
//   - State boundaries: geoBoundaries gbOpen MYS ADM1 (CC BY 4.0)
//     https://www.geoboundaries.org  (saved in scripts/raw/)
//   - Postcode -> city -> state: npm "malaysia-postcodes" by Asyraf Hussin (ISC)
//   - Town coordinates: GeoNames via npm "cities.json" (CC BY 4.0)
//
// Run: node scripts/build-data.mjs
import fs from 'node:fs'
import { createRequire } from 'node:module'
import { allPostcodes } from 'malaysia-postcodes'

const require = createRequire(import.meta.url)
const geonames = require('cities.json/cities.json').filter((c) => c.country === 'MY')

// id, display name, geoBoundaries name, malaysia-postcodes name, GeoNames admin1 code
const STATES = [
  ['jhr', 'Johor', 'Johor', 'Johor', '01'],
  ['kdh', 'Kedah', 'Kedah', 'Kedah', '02'],
  ['ktn', 'Kelantan', 'Kelantan', 'Kelantan', '03'],
  ['mlk', 'Melaka', 'Malacca', 'Melaka', '04'],
  ['nsn', 'Negeri Sembilan', 'Negeri Sembilan', 'Negeri Sembilan', '05'],
  ['phg', 'Pahang', 'Pahang', 'Pahang', '06'],
  ['prk', 'Perak', 'Perak', 'Perak', '07'],
  ['pls', 'Perlis', 'Perlis', 'Perlis', '08'],
  ['png', 'Pulau Pinang', 'Penang', 'Pulau Pinang', '09'],
  ['swk', 'Sarawak', 'Sarawak', 'Sarawak', '11'],
  ['sgr', 'Selangor', 'Selangor', 'Selangor', '12'],
  ['trg', 'Terengganu', 'Terengganu', 'Terengganu', '13'],
  ['kul', 'Kuala Lumpur', 'Kuala Lumpur', 'Wp Kuala Lumpur', '14'],
  ['lbn', 'Labuan', 'Labuan', 'Wp Labuan', '15'],
  ['sbh', 'Sabah', 'Sabah', 'Sabah', '16'],
  ['pjy', 'Putrajaya', 'Putrajaya', 'Wp Putrajaya', '17'],
].map(([id, name, geo, post, admin1]) => ({ id, name, geo, post, admin1 }))

// ---------- states ----------
const round = (n) => Math.round(n * 1000) / 1000

function simplify(points, tol) {
  // Douglas–Peucker
  if (points.length < 4) return points
  const sqSegDist = (p, a, b) => {
    let [x, y] = a
    let dx = b[0] - x, dy = b[1] - y
    if (dx || dy) {
      const t = Math.max(0, Math.min(1, ((p[0] - x) * dx + (p[1] - y) * dy) / (dx * dx + dy * dy)))
      x += dx * t
      y += dy * t
    }
    dx = p[0] - x
    dy = p[1] - y
    return dx * dx + dy * dy
  }
  const keep = new Uint8Array(points.length)
  keep[0] = keep[points.length - 1] = 1
  const stack = [[0, points.length - 1]]
  while (stack.length) {
    const [s, e] = stack.pop()
    let max = 0, idx = -1
    for (let i = s + 1; i < e; i++) {
      const d = sqSegDist(points[i], points[s], points[e])
      if (d > max) { max = d; idx = i }
    }
    if (max > tol * tol) {
      keep[idx] = 1
      stack.push([s, idx], [idx, e])
    }
  }
  return points.filter((_, i) => keep[i])
}

const ringArea = (r) => {
  let a = 0
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) a += (r[j][0] + r[i][0]) * (r[j][1] - r[i][1])
  return Math.abs(a / 2)
}

const geo = JSON.parse(fs.readFileSync(new URL('./raw/geoBoundaries-MYS-ADM1_simplified.geojson', import.meta.url)))
const statesOut = STATES.map((s) => {
  const f = geo.features.find((x) => x.properties.shapeName === s.geo)
  if (!f) throw new Error('missing state ' + s.geo)
  const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates
  const outer = polys.map((p) => p[0]) // ignore holes, none matter at this scale
  const biggest = Math.max(...outer.map(ringArea))
  const kept = outer
    .filter((r) => ringArea(r) > 0.004 || ringArea(r) === biggest)
    .map((r) => simplify(r, s.id === 'kul' || s.id === 'pjy' || s.id === 'lbn' ? 0.002 : 0.008).map(([x, y]) => [round(x), round(y)]))
    .filter((r) => r.length >= 4)
  // area-weighted centroid of the largest ring, for labels
  const main = kept.reduce((a, b) => (ringArea(a) > ringArea(b) ? a : b))
  let cx = 0, cy = 0
  main.forEach(([x, y]) => { cx += x; cy += y })
  return { id: s.id, name: s.name, centroid: [round(cx / main.length), round(cy / main.length)], polygons: kept }
})
fs.writeFileSync(new URL('../public/data/states.json', import.meta.url), JSON.stringify(statesOut))

// ---------- postcodes ----------
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
const byName = new Map()
for (const g of geonames) {
  const k = g.admin1 + ':' + norm(g.name)
  if (!byName.has(k)) byName.set(k, g)
}

// Large towns GeoNames lists under another name, or not at all (approximate town centres).
const MANUAL = {
  'png:pulaupinang': [5.414, 100.329],
  'mlk:melaka': [2.196, 102.248],
  'phg:temerloh': [3.45, 102.418],
  'trg:chukai': [4.233, 103.42],
  'trg:kemaman': [4.233, 103.42],
  'trg:kualaberang': [5.07, 103.01],
}

const towns = [] // [name, stateId, lat, lng, approx(0/1)]
const postcodes = {}
const pending = []
for (const st of allPostcodes) {
  const s = STATES.find((x) => x.post === st.name)
  if (!s) throw new Error('unknown postcode state ' + st.name)
  for (const city of st.city) {
    const manual = MANUAL[s.id + ':' + norm(city.name)]
    const g = manual ? { lat: manual[0], lng: manual[1] } : byName.get(s.admin1 + ':' + norm(city.name))
    const idx = towns.length
    towns.push([city.name, s.id, g ? Number(g.lat) : null, g ? Number(g.lng) : null, g ? 0 : 1])
    city.postcode.forEach((pc) => (postcodes[pc] = idx))
    if (!g) pending.push({ idx, stateId: s.id, pcs: city.postcode.map(Number) })
  }
}

// Towns GeoNames doesn't know: borrow coordinates from the town with the numerically
// closest postcode in the same state (Malaysian postcodes are geographically clustered).
const located = Object.entries(postcodes)
  .map(([pc, i]) => ({ pc: Number(pc), t: towns[i] }))
  .filter((x) => x.t[2] !== null)
for (const p of pending) {
  let best = null, bestD = Infinity
  for (const l of located) {
    if (l.t[1] !== p.stateId) continue
    for (const pc of p.pcs) {
      const d = Math.abs(l.pc - pc)
      if (d < bestD) { bestD = d; best = l.t }
    }
  }
  const t = towns[p.idx]
  if (best) { t[2] = best[2]; t[3] = best[3] }
  else {
    const c = statesOut.find((x) => x.id === p.stateId).centroid
    t[2] = c[1]; t[3] = c[0]
  }
  t[2] = round(t[2]); t[3] = round(t[3])
}
towns.forEach((t) => { t[2] = round(t[2]); t[3] = round(t[3]) })

fs.writeFileSync(new URL('../public/data/postcodes.json', import.meta.url), JSON.stringify({ towns, postcodes }))
const exact = towns.filter((t) => !t[4]).length
console.log(`states: ${statesOut.length}, towns: ${towns.length} (${exact} exact, ${towns.length - exact} approx), postcodes: ${Object.keys(postcodes).length}`)
