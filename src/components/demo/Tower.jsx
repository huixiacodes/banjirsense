import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { TOWER_POSITION } from '../../sim/terrain'
import { sim } from '../../sim/store'

/** 5G site. Emits cell-broadcast waves once the first WARNING is raised. */
export default function Tower({ broadcastFrom }) {
  const waves = useRef([])
  const beacon = useRef()

  useFrame(({ clock }) => {
    const active = sim.progress >= broadcastFrom
    const t = clock.elapsedTime
    beacon.current.material.emissiveIntensity = active ? 2 + Math.sin(t * 8) * 1.5 : 0.6
    waves.current.forEach((w, i) => {
      if (!w) return
      const k = ((t * 0.45 + i / 3) % 1)
      w.visible = active
      w.scale.setScalar(1 + k * 26)
      w.material.opacity = (1 - k) * 0.55
    })
  })

  const [x, y, z] = TOWER_POSITION
  return (
    <group position={[x, y, z]}>
      {/* lattice mast */}
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[Math.cos((i * Math.PI) / 2) * 0.18, 2.2, Math.sin((i * Math.PI) / 2) * 0.18]} rotation-z={0}>
          <cylinderGeometry args={[0.03, 0.05, 4.4, 6]} />
          <meshStandardMaterial color="#d7dde3" metalness={0.7} roughness={0.35} />
        </mesh>
      ))}
      {[0.8, 1.6, 2.4, 3.2, 4.0].map((h) => (
        <mesh key={h} position-y={h}>
          <torusGeometry args={[0.2, 0.02, 4, 4]} />
          <meshStandardMaterial color="#d7dde3" />
        </mesh>
      ))}
      {/* antenna panels */}
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[Math.cos((i * 2 * Math.PI) / 3) * 0.3, 4.1, Math.sin((i * 2 * Math.PI) / 3) * 0.3]} rotation-y={(-i * 2 * Math.PI) / 3}>
          <boxGeometry args={[0.08, 0.6, 0.2]} />
          <meshStandardMaterial color="#f5f7fa" />
        </mesh>
      ))}
      <mesh ref={beacon} position-y={4.6}>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshStandardMaterial color="#7cf7c8" emissive="#22e5a4" toneMapped={false} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh key={i} ref={(el) => (waves.current[i] = el)} position-y={4.1} rotation-x={-Math.PI / 2}>
          <ringGeometry args={[0.48, 0.5, 64]} />
          <meshBasicMaterial color="#5cf2c2" transparent depthWrite={false} toneMapped={false} />
        </mesh>
      ))}
      <Html position={[0, 5.3, 0]} center distanceFactor={18} zIndexRange={[20, 0]}>
        <div className="sensor-tag tower">5G site</div>
      </Html>
    </group>
  )
}
