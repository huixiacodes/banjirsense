import { useRef, useState } from 'react'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'
import PhoneAlert from '../demo/PhoneAlert'
import { lookupPostcode, loadPostcodes } from '../../api/postcodes'
import { readLevel, statusOf, STATUS_COLOR } from '../../api/stations'
import { LANGS } from '../../i18n/alerts'
import { enableAlerts, fireAlert, support } from '../../alerts/notify'
import { alertText } from '../../i18n/alerts'
import { formatClock } from '../../sim/flood'
import { play, reset, setApp, useApp, useSimProgress } from '../../sim/store'
import { nearestLive, timeAgo } from '../../api/live'
import ModeSwitch from '../ModeSwitch'
import { scrollToId } from '../../hooks/useSmoothScroll'

const EXAMPLES = [
  ['50450', 'KL'],
  ['40000', 'Shah Alam'],
  ['15000', 'Kota Bharu'],
  ['26600', 'Pekan'],
  ['96000', 'Sibu'],
]

export default function YourLocation() {
  const root = useRef()
  const { user, lang, alertsOn, mode, live } = useApp()
  const { progress } = useSimProgress(10)
  const [pc, setPc] = useState(user?.postcode ?? '')
  const [error, setError] = useState('')
  const [perm, setPerm] = useState(null)

  useGSAP(
    () => {
      gsap.from('.loc-head > *, .loc-form', {
        y: 40,
        opacity: 0,
        stagger: 0.1,
        duration: 0.9,
        scrollTrigger: { trigger: root.current, start: 'top 70%', onEnter: () => loadPostcodes() },
      })
    },
    { scope: root },
  )

  const search = async (value = pc) => {
    const code = value.trim()
    setPc(code)
    if (!/^\d{5}$/.test(code)) return setError('Malaysian postcodes have 5 digits.')
    const found = await lookupPostcode(code)
    if (!found) return setError(`Postcode ${code} not found.`)
    setError('')
    setApp({ user: found, regionId: found.station.region.id })
    gsap.fromTo('.loc-result', { y: 30, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.7, ease: 'power3.out' })
  }

  const turnOnAlerts = async () => {
    const res = await enableAlerts()
    setPerm(res)
    setApp({ alertsOn: true })
  }

  const testAlert = () => {
    if (!user) return
    const t = alertText(lang, 'WARNING', alertStation)
    fireAlert({ status: 'WARNING', title: `${t.title} · TEST`, body: t.body })
  }

  const near = user && mode === 'live' ? nearestLive(live, user.lat, user.lng) : null
  const isLive = mode === 'live' && !!near
  const alertStation = isLive ? near.station : user?.station
  const status = isLive ? near.station.status : user ? statusOf(user.station, readLevel(user.station, progress)) : 'NORMAL'
  const sup = support()

  return (
    <section id="location" ref={root} className="loc">
      <div className="loc-head">
        <span className="eyebrow">Your location</span>
        <h2>Type your postcode. Get your alert, in your language.</h2>
        <p>
          All 2,929 Malaysian postcodes. We find your town, the nearest river gauge and send the alert to this
          device as a notification, a siren and a vibration once its level rises.
        </p>
        <ModeSwitch />
      </div>

      <div className="loc-grid">
        <div className="loc-form glass">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              search()
            }}
          >
            <label htmlFor="pc">Postcode</label>
            <div className="pc-row">
              <input
                id="pc"
                inputMode="numeric"
                maxLength={5}
                placeholder="e.g. 50450"
                value={pc}
                onChange={(e) => setPc(e.target.value.replace(/\D/g, ''))}
              />
              <button className="btn-primary" type="submit">
                Find me
              </button>
            </div>
            {error && <div className="error">{error}</div>}
            <div className="examples">
              {EXAMPLES.map(([code, name]) => (
                <button type="button" key={code} onClick={() => search(code)}>
                  {code} <span>{name}</span>
                </button>
              ))}
            </div>
          </form>

          <label>Alert language</label>
          <div className="seg">
            {LANGS.map((l) => (
              <button key={l.id} className={l.id === lang ? 'on' : ''} onClick={() => setApp({ lang: l.id })}>
                {l.label}
              </button>
            ))}
          </div>

          <label>Alerts on this device</label>
          <div className="alert-row">
            <button className={alertsOn ? 'btn-ghost' : 'btn-primary'} onClick={turnOnAlerts}>
              {alertsOn ? '🔔 Alerts on' : '🔔 Turn on alerts'}
            </button>
            <button className="btn-ghost" disabled={!user || !alertsOn} onClick={testAlert}>
              Send test alert
            </button>
          </div>
          <div className="caps">
            <span className={perm?.permission === 'granted' ? 'ok' : perm?.permission === 'denied' ? 'bad' : ''}>
              Notifications{' '}
              {!sup.notifications ? 'not supported' : perm ? perm.permission.replace('default', 'not allowed') : '—'}
            </span>
            <span className={alertsOn && sup.sound ? 'ok' : ''}>Siren {sup.sound ? (alertsOn ? 'on' : '—') : 'not supported'}</span>
            <span className={alertsOn && sup.vibration ? 'ok' : ''}>
              Vibration {sup.vibration ? (alertsOn ? 'on' : '—') : 'not on this device'}
            </span>
          </div>
        </div>

        <div className="loc-result-wrap">
          {user ? (
            <div className="loc-result glass">
              <div className="loc-where">
                <span className="pin">📍</span>
                <div>
                  <b>
                    {user.town}, {user.state}
                  </b>
                  <span>
                    {user.postcode}
                    {user.approx && ' · approximate location'}
                  </span>
                </div>
              </div>
              {isLive ? (
                <div className="loc-station" style={{ '--c': STATUS_COLOR[status] }}>
                  <span className="muted small">
                    <span className="live-dot" /> Live · nearest JPS station · {near.km < 1 ? '<1' : Math.round(near.km)} km away
                  </span>
                  <b>{near.station.name}</b>
                  <div className="loc-level">
                    <span className="chip">{status}</span>
                    <span>{near.station.level.toFixed(2)} m</span>
                    {near.station.trend && <span className="muted small">{near.station.trend}</span>}
                    <span className="muted small">{timeAgo(near.station.updated)}</span>
                  </div>
                </div>
              ) : (
                <div className="loc-station" style={{ '--c': STATUS_COLOR[status] }}>
                  <span className="muted small">
                    {mode === 'live' && live ? 'No live JPS station within 40 km · simulated gauge' : 'Simulated gauge'} ·{' '}
                    {user.km < 1 ? '<1' : Math.round(user.km)} km away
                  </span>
                  <b>
                    {user.station.region.river} @ {user.station.town}
                  </b>
                  <div className="loc-level">
                    <span className="chip">{status}</span>
                    <span>{readLevel(user.station, progress).toFixed(2)} m</span>
                    <span className="muted small">{formatClock(progress)}</span>
                  </div>
                </div>
              )}
              <div className="alert-row">
                <button
                  className="btn-primary"
                  onClick={() => {
                    reset()
                    setTimeout(play, 1300)
                  }}
                >
                  ⛈ Simulate monsoon
                </button>
                <button className="btn-ghost" onClick={() => scrollToId('demo')}>
                  Valley view →
                </button>
              </div>
              {!alertsOn && <p className="muted small">Tip: turn on alerts first to get the notification, siren and vibration.</p>}
            </div>
          ) : (
            <div className="loc-empty">Enter a postcode to see your nearest river gauge.</div>
          )}
          <PhoneAlert
            alwaysShow
            className="phone-inline"
            station={alertStation}
            status={status}
            clock={isLive ? `Live ${new Date(near.station.updated).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit', hour12: false })}` : formatClock(progress)}
          />
        </div>
      </div>
    </section>
  )
}
