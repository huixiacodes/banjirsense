import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'
import MapScene, { liveSummary } from './MapScene'
import ModeSwitch from '../ModeSwitch'
import { loadStates } from './geo'
import SimControls from '../SimControls'
import { useInView } from '../../hooks/useInView'
import { scrollToId } from '../../hooks/useSmoothScroll'
import { ALL_STATIONS, regionsInState, nearestStation } from '../../api/regions'
import { readLevel, statusOf, worstStatus, STATUS, STATUS_COLOR } from '../../api/stations'
import { formatClock } from '../../sim/flood'
import { setApp, useApp, useSimProgress } from '../../sim/store'

export default function MalaysiaMap() {
  const root = useRef()
  const inView = useInView(root, '100px')
  const [states, setStates] = useState(null)
  const [selected, setSelected] = useState(null)
  const { progress } = useSimProgress(8)
  const { user, mode, live } = useApp()
  const isLive = mode === 'live' && !!live

  useEffect(() => {
    loadStates().then(setStates)
  }, [])

  useGSAP(
    () => {
      gsap.from('.map-head > *', {
        y: 40,
        opacity: 0,
        stagger: 0.12,
        duration: 0.9,
        scrollTrigger: { trigger: root.current, start: 'top 70%' },
      })
    },
    { scope: root },
  )

  const counts = isLive
    ? STATUS.map((s) => live.stations.filter((st) => st.status === s).length)
    : STATUS.map((s) => ALL_STATIONS.filter((st) => statusOf(st, readLevel(st, progress)) === s).length)
  const liveInState = isLive && selected ? live.stations.filter((s) => s.state === selected) : []
  const selState = states?.find((s) => s.id === selected)
  const selRegions = selected ? regionsInState(selected) : []

  const select = (id) => {
    setSelected(id)
    const r = id && regionsInState(id)[0]
    if (r) setApp({ regionId: r.id })
  }

  const openValley = (regionId) => {
    setApp({ regionId })
    scrollToId('demo')
  }

  return (
    <section id="map" ref={root} className="map-section">
      <div className="map-head">
        <span className="eyebrow">Nationwide · {ALL_STATIONS.length} gauges on {new Set(ALL_STATIONS.map((s) => s.region.river)).size} real rivers</span>
        <h2>One network, every state.</h2>
        <p>
          <b>Live</b> shows real river levels from JPS stations right now. <b>Simulation</b> runs a monsoon from the east coast
          across the peninsula and over to Borneo. Click a state to see its gauges.
        </p>
        <ModeSwitch />
      </div>

      <div className="map-stage">
        <div className="map-canvas">
          {states && <MapScene states={states} active={inView} selected={selected} onSelect={select} user={user} mode={mode} live={live} />}
        </div>

        <div className="hud hud-top glass">
          <span className="clock">{isLive ? 'LIVE' : formatClock(progress)}</span>
          {STATUS.map((s, i) => (
            <span key={s} className="legend" style={{ '--c': STATUS_COLOR[s] }}>
              {s} <b>{counts[i]}</b>
            </span>
          ))}
        </div>

        <div className={`hud map-panel glass ${selState ? 'open' : ''}`}>
          {selState && isLive ? (
            <>
              <button className="close" onClick={() => setSelected(null)} aria-label="Close">
                ×
              </button>
              <h3>{selState.name}</h3>
              {(() => {
                const sum = liveSummary(liveInState)
                const top = liveInState
                  .filter((s) => s.status !== 'NORMAL')
                  .sort((a, b) => STATUS.indexOf(b.status) - STATUS.indexOf(a.status))
                  .slice(0, 12)
                return (
                  <>
                    <p className="muted small">
                      {sum.count} live JPS stations · {sum.alerts} above normal
                    </p>
                    <ul className="live-list">
                      {top.map((s) => (
                        <li key={s.id} style={{ '--c': STATUS_COLOR[s.status] }}>
                          <span>
                            <b>{s.name}</b>
                            <small>
                              {s.status} · {s.trend ?? '—'}
                            </small>
                          </span>
                          <b>{s.level.toFixed(2)} m</b>
                        </li>
                      ))}
                      {top.length === 0 && <li className="muted small">All stations at normal level.</li>}
                    </ul>
                  </>
                )
              })()}
            </>
          ) : selState ? (
            <>
              <button className="close" onClick={() => setSelected(null)} aria-label="Close">
                ×
              </button>
              <h3>{selState.name}</h3>
              {selRegions.length === 0 && (
                <p className="muted small">
                  No gauges in this demo. Nearest:{' '}
                  {(() => {
                    const n = nearestStation(selState.centroid[1], selState.centroid[0])
                    return `${n.station.region.river} @ ${n.station.town} (${Math.round(n.km)} km)`
                  })()}
                </p>
              )}
              {selRegions.map((r) => {
                const st = r.stations.filter((s) => s.state === selected || r.states.length === 1)
                const worst = worstStatus(r.stations, progress)
                return (
                  <div key={r.id} className="map-region">
                    <div className="map-region-top">
                      <b>{r.river}</b>
                      <span className="chip" style={{ '--c': STATUS_COLOR[worst] }}>
                        {worst}
                      </span>
                    </div>
                    <ul>
                      {st.map((s) => {
                        const lv = readLevel(s, progress)
                        return (
                          <li key={s.id} style={{ '--c': STATUS_COLOR[statusOf(s, lv)] }}>
                            <span>{s.town}</span>
                            <b>{lv.toFixed(2)} m</b>
                          </li>
                        )
                      })}
                    </ul>
                    <button className="btn-ghost small" onClick={() => openValley(r.id)}>
                      Open valley view →
                    </button>
                  </div>
                )
              })}
            </>
          ) : (
            <p className="muted small">Click a state to see its rivers and gauges. Drag to tilt the map.</p>
          )}
        </div>

        <SimControls className="hud hud-bottom glass" />
      </div>
      <div className="map-foot">
        <span className="muted small">
          Live data: Jabatan Pengairan dan Saliran (JPS) via{' '}
          <a href="https://publicinfobanjir.water.gov.my" target="_blank" rel="noopener">
            publicinfobanjir.water.gov.my
          </a>
          . Unofficial view, check JPS for official warnings.
        </span>
      </div>
    </section>
  )
}
