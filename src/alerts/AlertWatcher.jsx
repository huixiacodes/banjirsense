import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { fireAlert } from './notify'
import { alertText } from '../i18n/alerts'
import { statusAt, STATUS, STATUS_COLOR } from '../api/stations'
import { getApp, onSimChange, sim, useApp } from '../sim/store'
import { nearestLive } from '../api/live'

/**
 * Watches the simulation for the user's nearest gauge. When it escalates
 * (ALERT → WARNING → DANGER) it fires a notification + siren + vibration and
 * shows an in-page toast (which works even with notifications blocked).
 */
export default function AlertWatcher() {
  const last = useRef('NORMAL')
  const lastP = useRef(0)
  const [toast, setToast] = useState(null)
  const el = useRef()

  useEffect(
    () =>
      onSimChange(() => {
        const { user, lang, alertsOn, mode } = getApp()
        if (mode !== 'sim') return
        const p = sim.progress
        if (p < lastP.current) last.current = 'NORMAL' // scrubbed backwards / reset
        lastP.current = p
        if (!user) return
        const s = statusAt(user.station, p)
        if (STATUS.indexOf(s) > STATUS.indexOf(last.current)) {
          const t = alertText(lang, s, user.station)
          if (alertsOn && sim.playing) fireAlert({ status: s, title: `${t.title} · ${t.level}`, body: t.body })
          if (sim.playing) setToast({ ...t, status: s, id: Date.now() })
        }
        last.current = s
      }),
    [],
  )

  // Live mode: compare each new JPS reading for the user's nearest station.
  const { mode, live, user, alertsOn, lang } = useApp()
  const lastLive = useRef({})
  useEffect(() => {
    if (mode !== 'live' || !live || !user) return
    const near = nearestLive(live, user.lat, user.lng)
    if (!near) return
    const st = near.station
    const prev = lastLive.current[st.id]
    lastLive.current[st.id] = st.status
    const rank = STATUS.indexOf(st.status)
    // alert on escalation, or once when we first see a station already above normal
    if (rank > 0 && (prev === undefined || rank > STATUS.indexOf(prev))) {
      const t = alertText(lang, st.status, st)
      if (alertsOn) fireAlert({ status: st.status, title: `${t.title} · ${t.level}`, body: t.body, tag: `jps-${st.id}` })
      setToast({ ...t, status: st.status, id: Date.now() })
    }
  }, [mode, live, user, alertsOn, lang])

  useEffect(() => {
    if (!toast) return
    gsap.fromTo(el.current, { x: 60, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.6, ease: 'back.out(1.5)' })
    const t = setTimeout(() => gsap.to(el.current, { x: 60, autoAlpha: 0, duration: 0.4 }), toast.status === 'DANGER' ? 9000 : 6000)
    return () => clearTimeout(t)
  }, [toast])

  return (
    <div ref={el} className="toast" style={{ '--c': toast ? STATUS_COLOR[toast.status] : '#fff' }} role="alert">
      {toast && (
        <>
          <div className="toast-head">
            ⚠ {toast.title} · {toast.level}
          </div>
          <p>{toast.body}</p>
        </>
      )}
    </div>
  )
}
