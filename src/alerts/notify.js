// Browser alerts: system notification + siren sound + vibration.
// Everything degrades gracefully: unsupported features are simply skipped.

let audioCtx = null
let swReg = null

export const support = () => ({
  notifications: typeof window !== 'undefined' && 'Notification' in window,
  vibration: typeof navigator !== 'undefined' && 'vibrate' in navigator,
  sound: typeof window !== 'undefined' && !!(window.AudioContext || window.webkitAudioContext),
})

/** Must be called from a click: browsers only allow sound/permission prompts after a user gesture. */
export async function enableAlerts() {
  const s = support()
  if (s.sound && !audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  if (audioCtx?.state === 'suspended') await audioCtx.resume()
  let permission = 'unsupported'
  if (s.notifications) {
    permission = Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission
    if (permission === 'granted' && 'serviceWorker' in navigator) {
      // Android Chrome only shows notifications through a service worker.
      swReg = await navigator.serviceWorker.register('/sw.js').catch(() => null)
    }
  }
  return { permission, ...s }
}

const PATTERNS = {
  // [frequency Hz, duration s] beeps; DANGER is a two-tone siren
  ALERT: { tones: [[880, 0.18], [0, 0.1], [880, 0.18]], vibrate: [200, 100, 200] },
  WARNING: { tones: [[740, 0.25], [988, 0.25], [740, 0.25], [988, 0.25]], vibrate: [400, 150, 400, 150, 400] },
  DANGER: {
    tones: Array.from({ length: 6 }, (_, i) => [i % 2 ? 660 : 1040, 0.32]),
    vibrate: [800, 200, 800, 200, 800, 200, 800],
  },
}

function playTones(tones) {
  if (!audioCtx) return
  let t = audioCtx.currentTime + 0.02
  const gain = audioCtx.createGain()
  gain.gain.value = 0.0001
  gain.connect(audioCtx.destination)
  const osc = audioCtx.createOscillator()
  osc.type = 'square'
  osc.connect(gain)
  for (const [f, d] of tones) {
    if (f) {
      osc.frequency.setValueAtTime(f, t)
      gain.gain.setValueAtTime(0.0001, t)
      gain.gain.exponentialRampToValueAtTime(0.12, t + 0.02)
      gain.gain.setValueAtTime(0.12, t + d - 0.03)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + d)
    }
    t += d
  }
  osc.start()
  osc.stop(t + 0.05)
}

/** Fire a flood alert through every channel the device supports. */
export function fireAlert({ status, title, body, tag = 'banjirsense' }) {
  const p = PATTERNS[status] ?? PATTERNS.ALERT
  playTones(p.tones)
  if (support().vibration) navigator.vibrate(p.vibrate)
  if (support().notifications && Notification.permission === 'granted') {
    const opts = { body, tag, renotify: true, requireInteraction: status === 'DANGER', icon: '/icon.svg', badge: '/icon.svg' }
    if (swReg) swReg.showNotification(title, opts).catch(() => {})
    else {
      try {
        new Notification(title, opts)
      } catch {
        /* some mobile browsers only allow service-worker notifications */
      }
    }
  }
}
