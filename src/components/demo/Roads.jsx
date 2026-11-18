import { Line } from '@react-three/drei'
import { BRIDGE, ROADS } from '../../sim/agents'

const lift = (pts) => pts.map(([x, y, z]) => [x, y + 0.03, z])

/** Riverside roads and the bridge residents use to reach the evacuation route. */
export default function Roads() {
  const len = Math.abs(BRIDGE.z1 - BRIDGE.z0) + 0.6
  return (
    <group>
      <Line points={lift(ROADS.south)} color="#b9a27a" lineWidth={2.5} />
      <Line points={lift(ROADS.north)} color="#b9a27a" lineWidth={2.5} />
      <group position={[BRIDGE.x, BRIDGE.deck - 0.05, (BRIDGE.z0 + BRIDGE.z1) / 2]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[0.7, 0.1, len]} />
          <meshStandardMaterial color="#9aa3ab" roughness={0.7} />
        </mesh>
        {[-0.33, 0.33].map((x) => (
          <mesh key={x} position={[x, 0.12, 0]}>
            <boxGeometry args={[0.04, 0.14, len]} />
            <meshStandardMaterial color="#e5e7eb" />
          </mesh>
        ))}
        {[-0.3, 0.3].map((z) => (
          <mesh key={z} position={[0, -0.6, z * len * 0.6]}>
            <boxGeometry args={[0.5, 1.1, 0.18]} />
            <meshStandardMaterial color="#6b7280" />
          </mesh>
        ))}
      </group>
    </group>
  )
}
