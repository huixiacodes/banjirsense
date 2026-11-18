import { useMemo, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'
import Scene from './Scene'
import PhoneAlert from './PhoneAlert'
import SimControls from '../SimControls'
import { useInView } from '../../hooks/useInView'
import { readLevel, statusOf, thresholdsOf, buildEventTimeline, worstStatus, STATUS, STATUS_COLOR } from '../../api/stations'
import { REGIONS, getRegion } from '../../api/regions'
import { heightAt, makeHouses, riverZ } from '../../sim/terrain'
import { makeAgents, planEvacuation, countStates } from '../../sim/agents'
import { rainAt, waterLevelAt, formatClock, formatDuration, EVENT_HOURS } from '../../sim/flood'
import { setApp, useApp, useSimProgress } from '../../sim/store'

const MAX_LEVEL = 5.6

function StationCard({ station, progress }) {
  const level = readLevel(station, progress)
  const status = statusOf(station, level)
  const t = thresholdsOf(station)
  const pct = (v) => `${Math.min(100, (v / MAX_LEVEL) * 100)}%`
  return (
    <div className="station" style={{ '--c': STATUS_COLOR[status] }}>
      <div className="station-top">
        <div>
          <div className="station-id">
            {station.id}
            {station.upstream && ' · upstream'}
          </div>
          <div className="station-name">{station.town}</div>
        </div>
        <div className="chip">{status}</div>
      </div>
      <div className="gauge">
        <div className="gauge-fill" style={{ width: pct(level) }} />
        {['alert', 'warning', 'danger'].map((k) => (
          <span key={k} className={`tick tick-${k}`} style={{ left: pct(t[k]) }} />
        ))}
      </div>
      <div className="station-level">
        {level.toFixed(2)} <small>m</small>
      </div>
    </div>
  )
}

/** Spread a region's real gauges along the stylised river, upstream → downstream. */
function placeStations(region) {
  const n = region.stations.length
  return region.stations.map((station, i) => {
    const x = n === 1 ? 0 : -16 + (31.5 * i) / (n - 1)
    const z = riverZ(x) + 1.7
    return { station, position: [x, heightAt(x, z), z] }
  })
}

export default function FloodDemo() {
  const section = useRef()
  const inView = useInView(section, '100px')
  const { progress } = useSimProgress()
  const { regionId, warningOn } = useApp()
  const region = getRegion(regionId)
  const [flooded, setFlooded] = useState(0)

  const houses = useMemo(() => makeHouses(), [])
  const placed = useMemo(() => placeStations(region), [region])
  const events = useMemo(() => buildEventTimeline(region.stations), [region])
  const firstWarning = events.find((e) => e.status === 'WARNING')
  const broadcast = warningOn ? firstWarning : undefined
  const evacuate = !warningOn ? undefined : events.find((e) => e.status === 'DANGER' && !e.station.upstream) ?? events.find((e) => e.status === 'DANGER')
  const firstHomeFloods = useMemo(() => {
    const lowest = Math.min(...houses.map((h) => h.y))
    for (let i = 0; i <= 2000; i++) if (waterLevelAt(i / 2000, region) > lowest + 0.05) return i / 2000
    return null
  }, [houses, region])
  const leadHours = broadcast && firstHomeFloods != null ? (firstHomeFloods - broadcast.p) * EVENT_HOURS : null
  const agents = useMemo(() => makeAgents(houses), [houses])
  const plans = useMemo(() => planEvacuation(agents, region, broadcast?.p ?? 2, warningOn), [agents, region, broadcast, warningOn])
  const people = countStates(agents, plans, progress)

  const seen = events.filter((e) => e.p <= progress)
  const status = worstStatus(region.stations, progress)
  // the phone shows the most severe gauge right now
  const phoneStation = region.stations.reduce((a, b) =>
    STATUS.indexOf(statusOf(b, readLevel(b, progress))) >= STATUS.indexOf(statusOf(a, readLevel(a, progress))) ? b : a,
  )
  const clock = formatClock(progress)
  const reached = broadcast && progress >= broadcast.p ? Math.round(18400 + Math.min(1, (progress - broadcast.p) * 8) * 23150 * region.severity) : 0

  useGSAP(
    () => {
      gsap.from('.demo-head > *', {
        y: 40,
        opacity: 0,
        stagger: 0.12,
        duration: 0.9,
        ease: 'power3.out',
        scrollTrigger: { trigger: section.current, start: 'top 70%' },
      })
    },
    { scope: section },
  )

  return (
    <section id="demo" ref={section} className="demo">
      <div className="demo-head">
        <span className="eyebrow">Valley view · real river, simulated levels</span>
        <h2>
          {region.river}, {region.area}.
          <br />
          Watch the warning beat the water.
        </h2>
        <p>
          Real gauge towns along the {region.river}, a 5G site and a kampung on the floodplain (the 3D terrain is
          stylised). Run the event and see upstream readings turn into phone alerts before homes flood.
        </p>
        <label className="region-pick">
          <span>River</span>
          <select value={region.id} onChange={(e) => setApp({ regionId: e.target.value })}>
            {REGIONS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.river} · {r.area}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="demo-stage">
        <div className="demo-view">
          <div className="demo-canvas">
            <Scene
              active={inView}
              region={region}
              houses={houses}
              stations={placed}
              broadcastFrom={broadcast?.p ?? 2}
              agents={agents}
              plans={plans}
              onFloodedChange={setFlooded}
            />
          </div>

          <div className="hud hud-top glass">
            <span className="clock">{clock}</span>
            <span className="rain">🌧 {Math.round(rainAt(progress, region) * 118)} mm/h</span>
            <span className="chip" style={{ '--c': STATUS_COLOR[status] }}>
              {status}
            </span>
          </div>

          <PhoneAlert station={warningOn ? phoneStation : null} status={status} clock={clock} />
  
          <SimControls className="hud hud-bottom glass" />
        </div>

        <div className="hud hud-left glass">
          <h3>{region.river} gauges</h3>
          {region.stations.map((s) => (
            <StationCard key={s.id} station={s} progress={progress} />
          ))}
        </div>

        <div className="hud hud-right glass">
          <div className="seg mode" role="group" aria-label="Warning system">
            <button className={warningOn ? 'on' : ''} onClick={() => setApp({ warningOn: true })}>
              With BanjirSense
            </button>
            <button className={!warningOn ? 'on bad' : ''} onClick={() => setApp({ warningOn: false })}>
              No warning
            </button>
          </div>
          <div className="stats">
            <div>
              <b className={flooded ? 'bad' : ''}>{flooded}</b>
              <span>homes flooded</span>
            </div>
            <div>
              <b className="good">{reached ? reached.toLocaleString() : '—'}</b>
              <span>phones alerted</span>
            </div>
            <div>
              <b className={warningOn ? 'good' : 'bad'}>
                {!warningOn ? 'none' : leadHours != null ? formatDuration(leadHours) : firstHomeFloods == null ? 'safe' : '—'}
              </b>
              <span>{!warningOn ? 'no warning sent' : firstHomeFloods == null ? 'no homes flood' : 'warning lead time'}</span>
            </div>
          </div>
          <div className="stats people">
            <div>
              <b className="good">{people.safe}</b>
              <span>safe at PPS</span>
            </div>
            <div>
              <b>{people.moving}</b>
              <span>evacuating</span>
            </div>
            <div>
              <b className={people.trapped ? 'bad' : ''}>{people.trapped}</b>
              <span>trapped</span>
            </div>
          </div>
          <h3>Event log</h3>
          <ol className="log">
            {seen.length === 0 && <li className="muted">All gauges normal. Waiting for rain…</li>}
            {seen
              .slice()
              .reverse()
              .map((e) => (
                <li key={e.station.id + e.status} style={{ '--c': STATUS_COLOR[e.status] }}>
                  <time>{formatClock(e.p)}</time>
                  <span>
                    {e.station.town} → <b>{e.status}</b>
                    {e === broadcast && ' · cell broadcast sent'}
                    {e === evacuate && ' · evacuation order'}
                  </span>
                </li>
              ))}
          </ol>
        </div>
      </div>
    </section>
  )
}
