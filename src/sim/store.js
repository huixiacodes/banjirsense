// Tiny shared store for the simulation clock.
// The 3D scene reads `sim.progress` every frame (no React re-render);
// the HUD subscribes through useSimProgress at a throttled rate.
import { useEffect, useState } from 'react'
import { gsap } from 'gsap'

export const sim = { progress: 0, playing: false }
const listeners = new Set()
const emit = () => listeners.forEach((l) => l())

let tween = null
const SECONDS_FOR_FULL_EVENT = 26

export function play() {
  if (appState.mode !== 'sim') setApp({ mode: 'sim' })
  if (sim.progress >= 0.999) sim.progress = 0
  tween?.kill()
  sim.playing = true
  tween = gsap.to(sim, {
    progress: 1,
    duration: SECONDS_FOR_FULL_EVENT * (1 - sim.progress),
    ease: 'none',
    onUpdate: emit,
    onComplete: () => {
      sim.playing = false
      emit()
    },
  })
  emit()
}

export function pause() {
  tween?.kill()
  sim.playing = false
  emit()
}

export function reset() {
  tween?.kill()
  sim.playing = false
  gsap.to(sim, { progress: 0, duration: 1.2, ease: 'power2.inOut', onUpdate: emit })
}

export function seek(p) {
  tween?.kill()
  sim.playing = false
  sim.progress = Math.min(1, Math.max(0, p))
  emit()
}

export function useSimProgress(fps = 20) {
  const [state, setState] = useState({ progress: sim.progress, playing: sim.playing })
  useEffect(() => {
    let last = 0
    let timer = null
    const update = () => {
      const now = performance.now()
      const run = () => {
        last = performance.now()
        timer = null
        setState({ progress: sim.progress, playing: sim.playing })
      }
      if (now - last >= 1000 / fps) run()
      else if (!timer) timer = setTimeout(run, 1000 / fps - (now - last))
    }
    listeners.add(update)
    return () => {
      listeners.delete(update)
      clearTimeout(timer)
    }
  }, [fps])
  return state
}

// ---------- app-wide selections (region, user location, language, alerts) ----------
const appState = {
  regionId: 'klang',
  lang: 'ms',
  user: null, // { postcode, town, state, lat, lng, approx, station, km }
  alertsOn: false,
  warningOn: true, // valley demo: with BanjirSense vs no warning
  mode: 'live', // 'live' = real JPS readings, 'sim' = monsoon simulation
  live: null, // { fetchedAt, count, stations[] }
  liveError: null,
  liveLoading: false,
}
const appListeners = new Set()

export function setApp(patch) {
  Object.assign(appState, patch)
  appListeners.forEach((l) => l())
}
export const getApp = () => appState

export function useApp() {
  const [, force] = useState(0)
  useEffect(() => {
    const l = () => force((n) => n + 1)
    appListeners.add(l)
    return () => appListeners.delete(l)
  }, [])
  return appState
}

/** Call fn whenever the simulation clock moves (not throttled). */
export function onSimChange(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
