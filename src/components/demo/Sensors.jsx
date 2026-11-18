import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { readLevel, statusOf, STATUS_COLOR } from '../../api/stations'
import { sim } from '../../sim/store'

function Sensor({ station, position }) {
  const group = useRef()
  const head = useRef()
  const ring = useRef()
  const label = useRef()
  const color = new THREE.Color()

  useFrame(({ clock }) => {
    group.current.visible = !!station
    if (!station) return
    const level = readLevel(station, sim.progress)
    const status = statusOf(station, level)
    color.set(STATUS_COLOR[status])
    head.current.material.color.copy(color)
    head.current.material.emissive.copy(color)
    ring.current.material.color.copy(color)
    const urgent = status === 'WARNING' || status === 'DANGER'
    const t = (clock.elapsedTime * (urgent ? 1.6 : 0.7)) % 1
    ring.current.scale.setScalar(0.4 + t * (urgent ? 2.6 : 1.2))
    ring.current.material.opacity = (1 - t) * (urgent ? 0.9 : 0.35)
    if (label.current) {
      label.current.dataset.status = status
      label.current.querySelector('.lvl').textContent = `${level.toFixed(2)} m`
    }
  })

  const [x, y, z] = position ?? [0, -50, 0]
  return (
    <group ref={group} position={[x, y, z]}>
      <mesh position-y={0.9} castShadow>
        <cylinderGeometry args={[0.05, 0.07, 1.8, 8]} />
        <meshStandardMaterial color="#c9d2da" metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh ref={head} position-y={1.9}>
        <sphereGeometry args={[0.18, 20, 20]} />
        <meshStandardMaterial emissiveIntensity={1.6} toneMapped={false} />
      </mesh>
      <mesh ref={ring} position-y={1.9} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[0.32, 0.38, 40]} />
        <meshBasicMaterial transparent side={THREE.DoubleSide} depthWrite={false} toneMapped={false} />
      </mesh>
      <Html position={[0, 2.5, 0]} center distanceFactor={18} zIndexRange={[20, 0]}>
        <div ref={label} className="sensor-tag" style={{ display: station ? undefined : 'none' }}>
          <b>{station?.town}</b>
          <span className="lvl">–</span>
        </div>
      </Html>
    </group>
  )
}

const SLOTS = [0, 1, 2, 3] // regions have up to 4 gauges

// Fixed slots: drei <Html> labels don't unmount cleanly under React 19, so we keep
// four sensors mounted and just hide the unused ones.
export default function Sensors({ stations }) {
  return SLOTS.map((i) => <Sensor key={i} station={stations[i]?.station} position={stations[i]?.position} />)
}
