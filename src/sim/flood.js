// The flood event is a pure function of `progress` (0 → 1 = 72 simulated hours)
// and the region (its severity and lag). GSAP plays it, the slider scrubs it,
// and every panel stays in sync.
import { RIVER_BED } from './terrain.js'

export const EVENT_HOURS = 72
export const WATER_BASE = RIVER_BED + 0.35 // normal river level in scene units
export const WATER_PEAK_RISE = 2.7

const smooth = (a, b, t) => {
  const k = Math.min(1, Math.max(0, (t - a) / (b - a)))
  return k * k * (3 - 2 * k)
}

/** Rain intensity 0..1 — a heavy monsoon burst followed by a long tail. */
export function rainAt(p, region) {
  const q = p - (region?.lag ?? 0)
  const strength = 0.45 + 0.55 * (region?.severity ?? 1)
  return strength * smooth(0.02, 0.14, q) * (1 - smooth(0.42, 0.7, q) * 0.85)
}

/** Fraction of peak flood (0..1) at time p for a point `lag` behind the start. */
export function floodShape(p, lag = 0) {
  const q = p - lag
  return smooth(0.08, 0.5, q) - 0.75 * smooth(0.62, 1.0, q)
}

/** Water surface height in the valley scene (sampled mid-valley). */
export function waterLevelAt(p, region) {
  return WATER_BASE + WATER_PEAK_RISE * (region?.severity ?? 1) * floodShape(p, (region?.lag ?? 0) + 0.08)
}

export function formatClock(p) {
  // Event starts Fri 06:00.
  const total = 6 + p * EVENT_HOURS
  const day = Math.floor(total / 24)
  const hh = Math.floor(total % 24)
  const mm = Math.floor((total * 60) % 60)
  const days = ['Fri', 'Sat', 'Sun', 'Mon']
  return `${days[day] ?? 'Mon'} ${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

export function formatDuration(hours) {
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  return `${h}h ${String(m).padStart(2, '0')}m`
}
