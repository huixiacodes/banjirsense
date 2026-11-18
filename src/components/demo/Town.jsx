import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { waterLevelAt } from '../../sim/flood'
import { sim } from '../../sim/store'

const WALLS = ['#f1e7d0', '#e8d6b0', '#d9e4e8', '#f4d7c6', '#e3e9d2']
const ROOFS = ['#9c3d2a', '#7c4a32', '#3d6b78', '#a65a2e', '#5b6770']
const FLOODED_ROOF = new THREE.Color('#ff3b3b')

/** Kampung-style terrace houses. Roofs turn red the moment water reaches the floor. */
export default function Town({ houses, region, onFloodedChange }) {
  const walls = useRef()
  const roofs = useRef()
  const lastCount = useRef(-1)
  const roofBase = useMemo(() => houses.map((h) => new THREE.Color(ROOFS[Math.floor(h.hue * ROOFS.length)])), [houses])

  useLayoutEffect(() => {
    const m = new THREE.Object3D()
    houses.forEach((h, i) => {
      m.position.set(h.x, h.y + 0.25 * h.scale, h.z)
      m.rotation.set(0, h.rot, 0)
      m.scale.setScalar(h.scale)
      m.updateMatrix()
      walls.current.setMatrixAt(i, m.matrix)
      walls.current.setColorAt(i, new THREE.Color(WALLS[Math.floor(h.hue * 97) % WALLS.length]))
      m.position.y = h.y + 0.68 * h.scale
      m.rotation.set(0, h.rot + Math.PI / 4, 0)
      m.updateMatrix()
      roofs.current.setMatrixAt(i, m.matrix)
      roofs.current.setColorAt(i, roofBase[i])
    })
    walls.current.instanceMatrix.needsUpdate = true
    roofs.current.instanceMatrix.needsUpdate = true
    walls.current.instanceColor.needsUpdate = true
    roofs.current.instanceColor.needsUpdate = true
  }, [houses, roofBase])

  useFrame(({ clock }) => {
    const level = waterLevelAt(sim.progress, region)
    const pulse = 0.65 + 0.35 * Math.sin(clock.elapsedTime * 6)
    const c = new THREE.Color()
    let flooded = 0
    houses.forEach((h, i) => {
      if (level > h.y + 0.05) {
        flooded++
        c.copy(roofBase[i]).lerp(FLOODED_ROOF, pulse)
      } else c.copy(roofBase[i])
      roofs.current.setColorAt(i, c)
    })
    roofs.current.instanceColor.needsUpdate = true
    if (flooded !== lastCount.current) {
      lastCount.current = flooded
      onFloodedChange?.(flooded)
    }
  })

  return (
    <group>
      <instancedMesh ref={walls} args={[null, null, houses.length]} castShadow receiveShadow>
        <boxGeometry args={[0.7, 0.5, 0.55]} />
        <meshStandardMaterial roughness={0.8} />
      </instancedMesh>
      <instancedMesh ref={roofs} args={[null, null, houses.length]} castShadow>
        <coneGeometry args={[0.56, 0.38, 4]} />
        <meshStandardMaterial roughness={0.6} />
      </instancedMesh>
    </group>
  )
}
