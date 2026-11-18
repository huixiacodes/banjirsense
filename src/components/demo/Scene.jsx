import { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import Terrain from './Terrain'
import Water from './Water'
import Rain from './Rain'
import Town from './Town'
import Sensors from './Sensors'
import Tower from './Tower'
import Evacuation from './Evacuation'
import Roads from './Roads'
import Agents from './Agents'
import { rainAt } from '../../sim/flood'
import { sim } from '../../sim/store'

const CLEAR_SKY = new THREE.Color('#a9d6e5')
const STORM_SKY = new THREE.Color('#27303b')

/** Sky, fog and lightning react to rain intensity. */
function Weather({ region }) {
  const sun = useRef()
  const amb = useRef()
  const flash = useRef(0)
  const tmp = new THREE.Color()

  useFrame(({ scene }, dt) => {
    const r = rainAt(sim.progress, region)
    tmp.copy(CLEAR_SKY).lerp(STORM_SKY, Math.min(1, r * 1.2))
    if (r > 0.55 && Math.random() < dt * 0.6) flash.current = 1
    flash.current = Math.max(0, flash.current - dt * 4)
    tmp.lerp(new THREE.Color('#e8f0ff'), flash.current * 0.7)
    scene.background.copy(tmp)
    scene.fog.color.copy(tmp)
    scene.fog.near = 30 - r * 12
    scene.fog.far = 75 - r * 30
    sun.current.intensity = 2.4 - r * 1.8 + flash.current * 3
    amb.current.intensity = 0.55 - r * 0.2 + flash.current
  })

  return (
    <>
      <color attach="background" args={['#a9d6e5']} />
      <fog attach="fog" args={['#a9d6e5', 30, 75]} />
      <hemisphereLight ref={amb} args={['#dff2ff', '#3a4a2a', 0.55]} />
      <directionalLight
        ref={sun}
        position={[14, 22, 8]}
        intensity={2.4}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-24}
        shadow-camera-right={24}
        shadow-camera-top={18}
        shadow-camera-bottom={-18}
      />
    </>
  )
}

export default function Scene({ active, region, houses, stations, broadcastFrom, agents, plans, onFloodedChange }) {
  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      frameloop={active ? 'always' : 'never'}
      camera={{ position: [20, 15, 22], fov: 42 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
    >
      <Weather region={region} />
      <Terrain />
      <Water region={region} />
      <Rain region={region} />
      <Town houses={houses} region={region} onFloodedChange={onFloodedChange} />
      <Sensors stations={stations} />
      <Tower broadcastFrom={broadcastFrom} />
      <Evacuation showFrom={broadcastFrom} />
      <Roads />
      <Agents agents={agents} plans={plans} region={region} />
      <OrbitControls
        enablePan={false}
        enableZoom={false}
        autoRotate
        autoRotateSpeed={0.35}
        minPolarAngle={0.5}
        maxPolarAngle={1.25}
        target={[0, 0, 0]}
      />
    </Canvas>
  )
}
