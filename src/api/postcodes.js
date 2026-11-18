// Postcode lookup from public/data/postcodes.json (built by scripts/build-data.mjs).
import { nearestStation } from './regions.js'

const STATE_NAMES = {
  jhr: 'Johor', kdh: 'Kedah', ktn: 'Kelantan', mlk: 'Melaka', nsn: 'Negeri Sembilan', phg: 'Pahang',
  prk: 'Perak', pls: 'Perlis', png: 'Pulau Pinang', swk: 'Sarawak', sgr: 'Selangor', trg: 'Terengganu',
  kul: 'WP Kuala Lumpur', lbn: 'WP Labuan', sbh: 'Sabah', pjy: 'WP Putrajaya',
}

let data = null
export function loadPostcodes() {
  data ??= fetch('/data/postcodes.json').then((r) => r.json())
  return data
}

/** Returns null for unknown postcodes. */
export async function lookupPostcode(pc) {
  const { towns, postcodes } = await loadPostcodes()
  const idx = postcodes[pc]
  if (idx === undefined) return null
  const [town, stateId, lat, lng, approx] = towns[idx]
  const near = nearestStation(lat, lng)
  return { postcode: pc, town, stateId, state: STATE_NAMES[stateId], lat, lng, approx: !!approx, station: near.station, km: near.km }
}
