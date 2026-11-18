// Live river levels from JPS, through our /api/jps function.
import { useEffect } from 'react'
import { getApp, setApp } from '../sim/store'
import { distanceKm } from './regions'

const POLL_MS = 5 * 60 * 1000

export async function fetchLive() {
  const res = await fetch('/api/jps')
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
  // shape each station like a simulated one so the alert text works for both
  data.stations.forEach((s) => (s.region = { river: s.river }))
  return data
}

/** Polls JPS while live mode is on. Mount once (in App). */
export function useLiveData() {
  useEffect(() => {
    let timer = null
    let cancelled = false
    const tick = async () => {
      if (getApp().mode !== 'live') return
      try {
        setApp({ liveError: null, liveLoading: !getApp().live })
        const live = await fetchLive()
        if (!cancelled) setApp({ live, liveLoading: false })
      } catch (e) {
        if (!cancelled) setApp({ liveError: e.message, liveLoading: false })
      }
    }
    tick()
    timer = setInterval(tick, POLL_MS)
    // refetch immediately when switching into live mode
    let lastMode = getApp().mode
    const unsub = setInterval(() => {
      const m = getApp().mode
      if (m !== lastMode) {
        lastMode = m
        if (m === 'live') tick()
      }
    }, 300)
    return () => {
      cancelled = true
      clearInterval(timer)
      clearInterval(unsub)
    }
  }, [])
}

/** Nearest live station to a point (within maxKm). */
export function nearestLive(live, lat, lng, maxKm = 40) {
  let best = null
  for (const st of live?.stations ?? []) {
    const km = distanceKm(lat, lng, st.lat, st.lng)
    if (km <= maxKm && (!best || km < best.km)) best = { station: st, km }
  }
  return best
}

export const timeAgo = (ms) => {
  const min = Math.round((Date.now() - ms) / 60000)
  if (min < 60) return `${min} min ago`
  const h = Math.floor(min / 60)
  return `${h} h ${min % 60} min ago`
}
