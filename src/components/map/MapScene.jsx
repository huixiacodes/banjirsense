import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Html, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { project } from './geo'
import { ALL_STATIONS } from '../../api/regions'
import { readLevel, statusOf, worstStatus, STATUS_COLOR } from '../../api/stations'
import { sim, onSimChange } from '../../sim/store'

const BASE = new THREE.Color('#1d3443')
const DEPTH = 0.32
const EMPTY = []

function stateGeometry(state) {
  const shapes = state.polygons.map((ring) => {
    const shape = new THREE.Shape()
    ring.forEach(([lng, lat], i) => {
      const [x, z] = project(lng, lat, state.id)
      // shape lives in XY; after rotating -90° about X, shape-Y becomes world -Z
      if (i === 0) shape.moveTo(x, -z)
      else shape.lineTo(x, -z)
    })
    return shape
  })
  const g = new THREE.ExtrudeGeometry(shapes, { depth: DEPTH, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.02, bevelSegments: 1 })
  g.rotateX(-Math.PI / 2)
  return g
}

function State({ state, stations, liveStatus, hovered, selected, onHover, onSelect }) {
  const mesh = useRef()
  const geometry = useMemo(() => stateGeometry(state), [state])
  const tint = useMemo(() => new THREE.Color(), [])

  useFrame(({ clock }, dt) => {
    const isLive = liveStatus !== undefined
    const hasData = isLive ? liveStatus !== null : stations.length > 0
    const status = isLive ? (liveStatus ?? 'NORMAL') : hasData ? worstStatus(stations, sim.progress) : 'NORMAL'
    const m = mesh.current.material
    tint.set(hasData ? STATUS_COLOR[status] : '#64748b')
    const strength = { NORMAL: 0.12, ALERT: 0.45, WARNING: 0.6, DANGER: 0.75 }[status]
    const pulse = status === 'DANGER' ? 0.15 * Math.sin(clock.elapsedTime * 5) : 0
    m.color.copy(BASE).lerp(tint, Math.min(1, strength + pulse + (hovered ? 0.15 : 0)))
    m.emissive.copy(tint)
    m.emissiveIntensity = hasData ? strength * 0.35 + (selected ? 0.25 : 0) : 0
    const targetY = hovered || selected ? 0.18 : 0
    mesh.current.position.y += (targetY - mesh.current.position.y) * Math.min(1, dt * 10)
  })

  return (
    <mesh
      ref={mesh}
      geometry={geometry}
      castShadow
      receiveShadow
      onPointerOver={(e) => {
        e.stopPropagation()
        onHover(state.id)
      }}
      onPointerOut={() => onHover(null)}
      onClick={(e) => {
        e.stopPropagation()
        onSelect(state.id)
      }}
    >
      <meshStandardMaterial roughness={0.55} metalness={0.1} />
    </mesh>
  )
}

function StationPillar({ station }) {
  const bar = useRef()
  const ring = useRef()
  const [x, z] = useMemo(() => project(station.lng, station.lat, station.state), [station])
  const c = useMemo(() => new THREE.Color(), [])

  useFrame(({ clock }) => {
    const level = readLevel(station, sim.progress)
    const status = statusOf(station, level)
    const h = 0.15 + (level - 1.2) * 0.45
    bar.current.scale.y = h
    bar.current.position.y = DEPTH + 0.05 + h / 2
    c.set(STATUS_COLOR[status])
    bar.current.material.color.copy(c)
    ring.current.material.color.copy(c)
    const urgent = status === 'WARNING' || status === 'DANGER'
    const t = (clock.elapsedTime * 1.2 + station.index * 0.3) % 1
    ring.current.visible = urgent
    ring.current.scale.setScalar(0.3 + t * 1.6)
    ring.current.material.opacity = 1 - t
  })

  return (
    <group position={[x, 0, z]}>
      <mesh ref={bar}>
        <cylinderGeometry args={[0.055, 0.055, 1, 10]} />
        <meshBasicMaterial toneMapped={false} />
      </mesh>
      <mesh ref={ring} position-y={DEPTH + 0.06} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[0.25, 0.3, 32]} />
        <meshBasicMaterial transparent depthWrite={false} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

function UserPin({ user }) {
  const ref = useRef()
  const [x, z] = project(user.lng, user.lat, user.stateId)
  useFrame(({ clock }) => {
    ref.current.position.y = DEPTH + 0.9 + Math.sin(clock.elapsedTime * 3) * 0.12
  })
  return (
    <group position={[x, 0, z]}>
      <mesh ref={ref} rotation-x={Math.PI}>
        <coneGeometry args={[0.18, 0.5, 16]} />
        <meshStandardMaterial color="#ffffff" emissive="#5cf2c2" emissiveIntensity={1.2} />
      </mesh>
      <Html position={[0, DEPTH + 1.55, 0]} center zIndexRange={[20, 0]}>
        <div className="sensor-tag you">You · {user.town}</div>
      </Html>
    </group>
  )
}

/** One label that stays mounted and follows the hovered state (mounting/unmounting <Html> on every hover is fragile). */
function HoverLabel({ state, stations, liveInfo }) {
  const [status, setStatus] = useState('NORMAL')
  const last = useRef(state)
  if (state) last.current = state
  useEffect(() => {
    const update = () => setStatus(stations.length ? worstStatus(stations, sim.progress) : 'NORMAL')
    update()
    return onSimChange(update)
  }, [stations])
  const shown = last.current
  const [x, z] = shown ? project(...shown.centroid, shown.id) : [0, 0]
  return (
    <Html position={[x, DEPTH + 0.6, z]} center zIndexRange={[25, 0]}>
      <div className="map-tip" style={{ '--c': STATUS_COLOR[status], opacity: state ? 1 : 0 }}>
        <b>{shown?.name}</b>
        <span style={liveInfo ? { color: STATUS_COLOR[liveInfo.status ?? 'NORMAL'] } : undefined}>
          {liveInfo
            ? liveInfo.count
              ? `${liveInfo.status} · ${liveInfo.count} live stations${liveInfo.alerts ? ` · ${liveInfo.alerts} above normal` : ''}`
              : 'No live readings'
            : stations.length
              ? `${status} · ${stations.length} gauges`
              : 'No gauges in this demo'}
        </span>
      </div>
    </Html>
  )
}

/** The map is wide; on narrow/portrait screens pull the camera back so all of it fits. */
function FitCamera({ controls }) {
  const { camera, size, scene } = useThree()
  useEffect(() => {
    const f = Math.min(3.2, Math.max(1, 1.75 / (size.width / size.height)))
    camera.position.set(0, 18.5 * f, 12 * f)
    camera.lookAt(0, 0, 0)
    if (scene.fog) {
      scene.fog.near = 28 * f
      scene.fog.far = 50 * f
    }
    controls.current?.update()
  }, [camera, size, scene, controls])
  return null
}

const RANK = { NORMAL: 0, ALERT: 1, WARNING: 2, DANGER: 3 }

/** All live JPS stations as one instanced mesh; height and colour by official status. */
function LivePillars({ stations }) {
  const bars = useRef()
  const rings = useRef([])
  const urgent = useMemo(() => stations.filter((s) => RANK[s.status] >= 2), [stations])
  useLayoutEffect(() => {
    const m = new THREE.Object3D()
    const c = new THREE.Color()
    stations.forEach((s, i) => {
      const [x, z] = project(s.lng, s.lat, s.state)
      const h = 0.12 + RANK[s.status] * 0.45
      m.position.set(x, DEPTH + 0.05 + h / 2, z)
      m.scale.set(1, h, 1)
      m.updateMatrix()
      bars.current.setMatrixAt(i, m.matrix)
      bars.current.setColorAt(i, c.set(STATUS_COLOR[s.status]))
    })
    bars.current.count = stations.length
    bars.current.instanceMatrix.needsUpdate = true
    if (bars.current.instanceColor) bars.current.instanceColor.needsUpdate = true
  }, [stations])
  useFrame(({ clock }) => {
    rings.current.forEach((r, i) => {
      if (!r) return
      const t = (clock.elapsedTime * 1.1 + i * 0.17) % 1
      r.scale.setScalar(0.3 + t * 1.5)
      r.material.opacity = 1 - t
    })
  })
  return (
    <group>
      <instancedMesh ref={bars} args={[null, null, Math.max(1, stations.length)]} frustumCulled={false}>
        <cylinderGeometry args={[0.035, 0.035, 1, 6]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      {urgent.map((s, i) => {
        const [x, z] = project(s.lng, s.lat, s.state)
        return (
          <mesh key={s.id} ref={(el) => (rings.current[i] = el)} position={[x, DEPTH + 0.06, z]} rotation-x={-Math.PI / 2}>
            <ringGeometry args={[0.25, 0.3, 32]} />
            <meshBasicMaterial color={STATUS_COLOR[s.status]} transparent depthWrite={false} toneMapped={false} side={THREE.DoubleSide} />
          </mesh>
        )
      })}
    </group>
  )
}

/**
 * A state's colour reflects how widespread raised levels are, not one outlier:
 * a level counts only if at least max(2, 8%) of the state's stations are at it or above.
 */
export function liveSummary(stations) {
  if (!stations.length) return { status: null, count: 0, alerts: 0, worst: null }
  const atLeast = [0, 0, 0, 0]
  let worst = 'NORMAL'
  for (const s of stations) {
    for (let r = 0; r <= RANK[s.status]; r++) atLeast[r]++
    if (RANK[s.status] > RANK[worst]) worst = s.status
  }
  const need = Math.max(2, Math.ceil(stations.length * 0.08))
  let rank = 0
  for (let r = 1; r <= 3; r++) if (atLeast[r] >= need) rank = r
  return { status: ['NORMAL', 'ALERT', 'WARNING', 'DANGER'][rank], count: stations.length, alerts: atLeast[1], worst }
}

export default function MapScene({ states, active, selected, onSelect, user, mode, live }) {
  const isLive = mode === 'live' && !!live
  const liveByState = useMemo(() => {
    const m = {}
    for (const st of live?.stations ?? []) if (st.state) (m[st.state] ??= []).push(st)
    return m
  }, [live])
  const [hovered, setHovered] = useState(null)
  const controls = useRef()
  const byState = useMemo(() => {
    const m = {}
    for (const st of ALL_STATIONS) (m[st.state] ??= []).push(st)
    return m
  }, [])
  const hoveredState = states.find((s) => s.id === hovered)

  useEffect(() => {
    document.body.style.cursor = hovered ? 'pointer' : ''
    return () => (document.body.style.cursor = '')
  }, [hovered])

  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      frameloop={active ? 'always' : 'never'}
      camera={{ position: [0, 18.5, 12], fov: 42 }}
      onPointerMissed={() => onSelect(null)}
    >
      <color attach="background" args={['#06121b']} />
      <fog attach="fog" args={['#06121b', 28, 50]} />
      <hemisphereLight args={['#cfe8ff', '#06121b', 0.7]} />
      <directionalLight position={[-8, 16, 10]} intensity={2.2} castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-20} shadow-camera-right={20} shadow-camera-top={12} shadow-camera-bottom={-12} />
      <mesh rotation-x={-Math.PI / 2} position-y={-0.02} receiveShadow>
        <planeGeometry args={[80, 50]} />
        <meshStandardMaterial color="#0a2030" roughness={0.9} />
      </mesh>
      <gridHelper args={[80, 40, '#123246', '#0d2636']} position-y={0} />
      {states.map((s) => (
        <State
          key={s.id}
          state={s}
          stations={byState[s.id] ?? []}
          liveStatus={isLive ? liveSummary(liveByState[s.id] ?? []).status : undefined}
          hovered={hovered === s.id}
          selected={selected === s.id}
          onHover={setHovered}
          onSelect={onSelect}
        />
      ))}
      <group visible={!isLive}>
        {ALL_STATIONS.map((st) => (
          <StationPillar key={st.id} station={st} />
        ))}
      </group>
      {isLive && <LivePillars key={live.fetchedAt} stations={live.stations} />}
      {user && <UserPin user={user} />}
      <HoverLabel
        state={hoveredState}
        stations={hoveredState ? (byState[hoveredState.id] ?? []) : EMPTY}
        liveInfo={isLive && hoveredState ? liveSummary(liveByState[hoveredState.id] ?? []) : null}
      />
      <FitCamera controls={controls} />
      <OrbitControls ref={controls} enablePan={false} enableZoom={false} minPolarAngle={0.35} maxPolarAngle={1.1} minAzimuthAngle={-0.6} maxAzimuthAngle={0.6} target={[0, 0, 0]} />
    </Canvas>
  )
}
