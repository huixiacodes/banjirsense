// Real rivers and real towns. Water levels are SIMULATED.
// Coordinates come from GeoNames (CC BY 4.0) via the cities.json package;
// entries marked `approx` were placed by hand at the town centre.
//
// The scenario is a fictional northeast-monsoon event: the east coast is hit first
// and hardest, then the surge spreads south and west and across to Borneo.
// `severity` scales the peak (1 = reaches DANGER), `lag` delays the event (0..0.2 of 72 h).

const s = (town, state, lat, lng, approx = false) => ({ town, state, lat, lng, approx })

export const REGIONS = [
  {
    id: 'klang', river: 'Sg. Klang', states: ['kul', 'sgr'], area: 'Klang Valley', severity: 0.95, lag: 0.1,
    stations: [s('Ampang', 'kul', 3.15, 101.767), s('Kuala Lumpur', 'kul', 3.141, 101.687), s('Shah Alam', 'sgr', 3.085, 101.533), s('Klang', 'sgr', 3.037, 101.443)],
  },
  {
    id: 'kelantan', river: 'Sg. Kelantan', states: ['ktn'], area: 'Kelantan', severity: 1.0, lag: 0,
    stations: [s('Kuala Krai', 'ktn', 5.531, 102.199), s('Tanah Merah', 'ktn', 5.8, 102.15), s('Pasir Mas', 'ktn', 6.049, 102.14), s('Kota Bharu', 'ktn', 6.124, 102.243)],
  },
  {
    id: 'terengganu', river: 'Sg. Terengganu', states: ['trg'], area: 'Terengganu', severity: 0.9, lag: 0.02,
    stations: [s('Kuala Berang', 'trg', 5.07, 103.01, true), s('Kuala Terengganu', 'trg', 5.33, 103.141)],
  },
  {
    id: 'pahang', river: 'Sg. Pahang', states: ['phg'], area: 'Pahang', severity: 0.92, lag: 0.05,
    stations: [s('Jerantut', 'phg', 3.936, 102.363), s('Temerloh', 'phg', 3.45, 102.418, true), s('Pekan', 'phg', 3.484, 103.4)],
  },
  {
    id: 'muar', river: 'Sg. Muar', states: ['jhr'], area: 'Johor', severity: 0.88, lag: 0.12,
    stations: [s('Segamat', 'jhr', 2.515, 102.816), s('Pagoh', 'jhr', 2.15, 102.77), s('Muar', 'jhr', 2.044, 102.569)],
  },
  {
    id: 'perak', river: 'Sg. Perak', states: ['prk'], area: 'Perak', severity: 0.6, lag: 0.08,
    stations: [s('Kuala Kangsar', 'prk', 4.767, 100.933), s('Parit', 'prk', 4.483, 100.917), s('Teluk Intan', 'prk', 4.022, 101.021)],
  },
  {
    id: 'kedah', river: 'Sg. Kedah', states: ['kdh'], area: 'Kedah', severity: 0.48, lag: 0.05,
    stations: [s('Alor Setar', 'kdh', 6.121, 100.36), s('Kuala Kedah', 'kdh', 6.1, 100.3)],
  },
  {
    id: 'perlis', river: 'Sg. Perlis', states: ['pls'], area: 'Perlis', severity: 0.4, lag: 0.05,
    stations: [s('Kangar', 'pls', 6.441, 100.199), s('Kuala Perlis', 'pls', 6.4, 100.133)],
  },
  {
    id: 'prai', river: 'Sg. Prai', states: ['png'], area: 'Pulau Pinang', severity: 0.52, lag: 0.07,
    stations: [s('Bukit Mertajam', 'png', 5.363, 100.467), s('Perai', 'png', 5.383, 100.383)],
  },
  {
    id: 'linggi', river: 'Sg. Linggi', states: ['nsn'], area: 'Negeri Sembilan', severity: 0.56, lag: 0.11,
    stations: [s('Seremban', 'nsn', 2.73, 101.938), s('Linggi', 'nsn', 2.486, 102.01)],
  },
  {
    id: 'melaka', river: 'Sg. Melaka', states: ['mlk'], area: 'Melaka', severity: 0.55, lag: 0.12,
    stations: [s('Alor Gajah', 'mlk', 2.38, 102.209), s('Melaka', 'mlk', 2.196, 102.248, true)],
  },
  {
    id: 'rajang', river: 'Batang Rajang', states: ['swk'], area: 'Sarawak', severity: 0.78, lag: 0.14,
    stations: [s('Kapit', 'swk', 1.995, 112.933), s('Song', 'swk', 2.017, 112.55), s('Kanowit', 'swk', 2.1, 112.15), s('Sibu', 'swk', 2.3, 111.817)],
  },
  {
    id: 'sarawak', river: 'Sg. Sarawak', states: ['swk'], area: 'Kuching', severity: 0.62, lag: 0.16,
    stations: [s('Bau', 'swk', 1.417, 110.15), s('Kuching', 'swk', 1.55, 110.333)],
  },
  {
    id: 'padas', river: 'Sg. Padas', states: ['sbh'], area: 'Sabah', severity: 0.74, lag: 0.15,
    stations: [s('Tenom', 'sbh', 5.119, 115.937), s('Beaufort', 'sbh', 5.347, 115.746)],
  },
]

// Give every station an id and a back-reference to its region.
for (const r of REGIONS) {
  r.stations.forEach((st, i) => {
    st.id = `${r.id.toUpperCase()}-${i + 1}`
    st.region = r
    st.index = i
    st.upstream = i === 0
  })
}

export const ALL_STATIONS = REGIONS.flatMap((r) => r.stations)
export const getRegion = (id) => REGIONS.find((r) => r.id === id) ?? REGIONS[0]
export const regionsInState = (stateId) => REGIONS.filter((r) => r.states.includes(stateId))

const toRad = (d) => (d * Math.PI) / 180
export function distanceKm(aLat, aLng, bLat, bLng) {
  const dLat = toRad(bLat - aLat)
  const dLng = toRad(bLng - aLng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2
  return 6371 * 2 * Math.asin(Math.sqrt(h))
}

export function nearestStation(lat, lng) {
  let best = null
  for (const st of ALL_STATIONS) {
    const d = distanceKm(lat, lng, st.lat, st.lng)
    if (!best || d < best.km) best = { station: st, km: d }
  }
  return best
}
