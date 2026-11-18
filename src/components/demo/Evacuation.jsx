import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html, Line } from '@react-three/drei'
import * as THREE from 'three'
import { PPS_POSITION } from '../../sim/terrain'
import { ROUTE } from '../../sim/agents'
import { sim } from '../../sim/store'

/** Temporary evacuation centre (PPS) on high ground + the safe route to it. */
export default function Evacuation({ showFrom }) {
  const line = useRef()
  // same route the residents walk (sim/agents.js)
  const points = useMemo(() => ROUTE.map(([x, y, z]) => new THREE.Vector3(x, y + 0.16, z)), [])

  useFrame((_, dt) => {
    const on = sim.progress >= showFrom
    line.current.visible = on
    if (on) line.current.material.dashOffset -= dt * 1.2
  })

  const [x, y, z] = PPS_POSITION
  return (
    <group>
      <Line ref={line} points={points} color="#5cf2c2" lineWidth={3} dashed dashSize={0.5} gapSize={0.3} />
      <group position={[x, y, z]}>
        <mesh position-y={0.4} castShadow>
          <boxGeometry args={[1.8, 0.8, 1.2]} />
          <meshStandardMaterial color="#f8fafc" />
        </mesh>
        <mesh position-y={0.95} rotation-y={Math.PI / 4}>
          <coneGeometry args={[1.35, 0.5, 4]} />
          <meshStandardMaterial color="#1e7a5b" />
        </mesh>
        <Html position={[0, 1.8, 0]} center distanceFactor={18} zIndexRange={[20, 0]}>
          <div className="sensor-tag pps">PPS · evacuation centre</div>
        </Html>
      </group>
    </group>
  )
}
