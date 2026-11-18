// Mock telemetry API.
// In production this layer would call a real feed (e.g. the JPS public flood-info
// service, or the operator's own IoT platform). Components only talk to these
// functions, so swapping the data source doesn't touch the UI.
import { floodShape } from '../sim/flood.js'
import { ALL_STATIONS } from './regions.js'

export const STATUS = ['NORMAL', 'ALERT', 'WARNING', 'DANGER']
export const STATUS_COLOR = {
  NORMAL: '#34d399',
  ALERT: '#facc15',
  WARNING: '#fb923c',
  DANGER: '#ef4444',
}

const NORMAL_LEVEL = 1.2
const GAIN = 4.2
const STATION_LAG = 0.035
// Upstream gauges get lower trigger levels, so the warning goes out early.
const THRESHOLDS = {
  upstream: { alert: 1.9, warning: 2.4, danger: 3.6 },
  default: { alert: 2.6, warning: 3.3, danger: 4.0 },
}

export const thresholdsOf = (st) => (st.upstream ? THRESHOLDS.upstream : THRESHOLDS.default)

export async function getStations() {
  await new Promise((r) => setTimeout(r, 200)) // pretend network latency
  return ALL_STATIONS
}

/** Simulated water level (m) for a station at progress p. */
export function readLevel(st, p) {
  const r = st.region
  return NORMAL_LEVEL + GAIN * r.severity * Math.max(0, floodShape(p, r.lag + st.index * STATION_LAG))
}

export function statusOf(st, level) {
  const t = thresholdsOf(st)
  if (level >= t.danger) return 'DANGER'
  if (level >= t.warning) return 'WARNING'
  if (level >= t.alert) return 'ALERT'
  return 'NORMAL'
}

export const statusAt = (st, p) => statusOf(st, readLevel(st, p))

export function worstStatus(stations, p) {
  let worst = 0
  for (const st of stations) worst = Math.max(worst, STATUS.indexOf(statusAt(st, p)))
  return STATUS[worst]
}

/** When each station crosses each threshold on the rising limb. */
export function buildEventTimeline(stations) {
  const events = []
  for (const st of stations) {
    let prev = 'NORMAL'
    for (let i = 0; i <= 2000; i++) {
      const p = i / 2000
      const s = statusAt(st, p)
      if (STATUS.indexOf(s) > STATUS.indexOf(prev)) events.push({ p, station: st, status: s })
      prev = s
    }
  }
  return events.sort((a, b) => a.p - b.p)
}
