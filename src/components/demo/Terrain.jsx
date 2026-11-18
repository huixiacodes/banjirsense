import { useMemo } from 'react'
import * as THREE from 'three'
import { TERRAIN, heightAt, riverZ } from '../../sim/terrain'

const mud = new THREE.Color('#7a5b3a')
const grass = new THREE.Color('#5f9e4a')
const palm = new THREE.Color('#2f6b3a')
const hill = new THREE.Color('#3d5a2e')

export default function Terrain() {
  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(TERRAIN.width, TERRAIN.depth, TERRAIN.segX, TERRAIN.segZ)
    g.rotateX(-Math.PI / 2)
    const pos = g.attributes.position
    const colors = new Float32Array(pos.count * 3)
    const c = new THREE.Color()
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const z = pos.getZ(i)
      const y = heightAt(x, z)
      pos.setY(i, y)
      const d = Math.abs(z - riverZ(x))
      if (d < 1.9) c.copy(mud)
      else if (y < 1.2) c.copy(grass).lerp(palm, Math.min(1, Math.max(0, (d - 6) / 6)))
      else c.copy(palm).lerp(hill, Math.min(1, (y - 1.2) / 2.5))
      // tiny noise so it doesn't look flat-shaded plastic
      c.offsetHSL(0, 0, (Math.sin(x * 3.1) * Math.cos(z * 2.7)) * 0.025)
      colors.set([c.r, c.g, c.b], i * 3)
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    g.computeVertexNormals()
    return g
  }, [])

  return (
    <mesh geometry={geometry} receiveShadow>
      <meshStandardMaterial vertexColors roughness={0.95} metalness={0} />
    </mesh>
  )
}
