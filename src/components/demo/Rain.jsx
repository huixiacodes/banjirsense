import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { rainAt } from '../../sim/flood'
import { sim } from '../../sim/store'

const COUNT = 2600
const W = 46, D = 34, TOP = 16

export default function Rain({ region }) {
  const ref = useRef()
  const { geometry, speeds } = useMemo(() => {
    const positions = new Float32Array(COUNT * 6)
    const speeds = new Float32Array(COUNT)
    for (let i = 0; i < COUNT; i++) {
      const x = (Math.random() - 0.5) * W
      const y = Math.random() * TOP
      const z = (Math.random() - 0.5) * D
      positions.set([x, y, z, x - 0.05, y - 0.45, z], i * 6)
      speeds[i] = 18 + Math.random() * 10
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return { geometry: g, speeds }
  }, [])

  useFrame((_, dt) => {
    const intensity = rainAt(sim.progress, region)
    ref.current.material.opacity = intensity * 0.55
    ref.current.visible = intensity > 0.01
    if (!ref.current.visible) return
    const pos = geometry.attributes.position.array
    const step = Math.min(dt, 0.05)
    for (let i = 0; i < COUNT; i++) {
      const o = i * 6
      const dy = speeds[i] * step
      pos[o + 1] -= dy
      pos[o + 4] -= dy
      if (pos[o + 4] < -1.5) {
        const y = TOP + Math.random() * 2
        pos[o + 1] = y
        pos[o + 4] = y - 0.45
      }
    }
    geometry.attributes.position.needsUpdate = true
  })

  return (
    <lineSegments ref={ref} geometry={geometry} frustumCulled={false}>
      <lineBasicMaterial color="#cfe6ff" transparent opacity={0} depthWrite={false} />
    </lineSegments>
  )
}
