import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { agentState, along } from '../../sim/agents'
import { sim } from '../../sim/store'
import { waterLevelAt } from '../../sim/flood'

const SHIRTS = ['#f59e0b', '#3b82f6', '#10b981', '#e11d48', '#a855f7', '#f8fafc', '#14b8a6', '#facc15']
const CARS = ['#e5e7eb', '#1f2937', '#dc2626', '#2563eb', '#9ca3af', '#f8fafc', '#0f766e']
const SKIN = new THREE.Color('#c58c5c')
const TRAPPED = new THREE.Color('#ff2d2d')

/** Low-poly residents and cars. Positions come from the pure evacuation plan. */
const PERSON = 1.9 // scale: readable from the default camera distance
const CAR = 1.5

export default function Agents({ agents, plans, region }) {
  const people = useMemo(() => agents.filter((a) => a.kind === 'person'), [agents])
  const cars = useMemo(() => agents.filter((a) => a.kind === 'car'), [agents])
  const bodies = useRef(), heads = useRef(), carBody = useRef(), carTop = useRef()
  const base = useMemo(
    () => ({
      shirt: agents.map((a) => new THREE.Color(SHIRTS[Math.floor(a.hue * SHIRTS.length)])),
      car: agents.map((a) => new THREE.Color(CARS[Math.floor(a.hue * CARS.length)])),
    }),
    [agents],
  )

  useLayoutEffect(() => {
    people.forEach((a, i) => heads.current.setColorAt(i, SKIN))
    heads.current.instanceColor.needsUpdate = true
  }, [people])

  const m = useMemo(() => new THREE.Object3D(), [])
  const c = useMemo(() => new THREE.Color(), [])

  useFrame(({ clock }) => {
    const p = sim.progress
    const t = clock.elapsedTime
    const blink = Math.sin(t * 8) > 0
    const water = waterLevelAt(p, region)

    people.forEach((a, i) => {
      const plan = plans[a.id]
      const { state, dist } = agentState(a, plan, p)
      let [x, y, z] = a.path.points[0]
      let dir = 0
      let bob = 0
      if (state === 'home') {
        // pottering around the front of the house
        const ph = a.seed * 20
        x += Math.sin(t * 0.4 + ph) * 0.35
        z += Math.cos(t * 0.3 + ph) * 0.2
        dir = t * 0.4 + ph
      } else {
        const at = along(a.path, dist)
        ;[x, y, z] = at.pos
        dir = at.dir
        if (state === 'moving') bob = Math.abs(Math.sin(t * 10 + a.seed * 9)) * 0.03
        if (state === 'safe') dir = a.seed * 6.28
      }
      if (state === 'trapped') {
        const h = a.home
        if (dist < 1.2) {
          // stranded on their own roof, waving for help
          x = h.x + (a.seed - 0.5) * 0.25
          z = h.z + (a.seed * 7 % 1 - 0.5) * 0.2
          y = Math.max(h.y + 0.86 * h.scale, water - 0.12)
        } else {
          y = Math.max(y, water - 0.12) // swept up, head above water
        }
        bob = Math.abs(Math.sin(t * 6 + a.seed * 9)) * 0.06
      }
      m.position.set(x, y + 0.11 * PERSON + bob, z)
      m.rotation.set(0, dir, 0)
      m.scale.setScalar(PERSON)
      m.updateMatrix()
      bodies.current.setMatrixAt(i, m.matrix)
      m.position.y += 0.13 * PERSON
      m.updateMatrix()
      heads.current.setMatrixAt(i, m.matrix)
      c.copy(state === 'trapped' && blink ? TRAPPED : base.shirt[a.id])
      bodies.current.setColorAt(i, c)
    })
    bodies.current.instanceMatrix.needsUpdate = true
    heads.current.instanceMatrix.needsUpdate = true
    bodies.current.instanceColor.needsUpdate = true

    cars.forEach((a, i) => {
      const plan = plans[a.id]
      const { state, dist } = agentState(a, plan, p)
      let x, y, z, dir
      if (state === 'home') {
        ;[x, y, z] = a.path.points[0]
        x += 0.6
        dir = Math.PI / 2
      } else {
        const at = along(a.path, dist)
        ;[x, y, z] = at.pos
        dir = at.dir
      }
      if (state === 'trapped') y = Math.max(y, water - 0.1) // floating, half submerged
      m.position.set(x, y + 0.07 * CAR, z)
      m.rotation.set(state === 'trapped' ? 0.12 : 0, dir, state === 'trapped' ? 0.18 : 0)
      m.scale.setScalar(CAR)
      m.updateMatrix()
      carBody.current.setMatrixAt(i, m.matrix)
      m.position.y += 0.1 * CAR
      m.updateMatrix()
      carTop.current.setMatrixAt(i, m.matrix)
      c.copy(base.car[a.id])
      if (state === 'trapped' && blink) c.set('#ff9a1f') // hazard lights
      carBody.current.setColorAt(i, c)
    })
    carBody.current.instanceMatrix.needsUpdate = true
    carTop.current.instanceMatrix.needsUpdate = true
    if (carBody.current.instanceColor) carBody.current.instanceColor.needsUpdate = true
  })

  return (
    <group>
      <instancedMesh ref={bodies} args={[null, null, people.length]} castShadow frustumCulled={false}>
        <capsuleGeometry args={[0.05, 0.11, 4, 8]} />
        <meshStandardMaterial roughness={0.7} />
      </instancedMesh>
      <instancedMesh ref={heads} args={[null, null, people.length]} castShadow frustumCulled={false}>
        <sphereGeometry args={[0.045, 10, 10]} />
        <meshStandardMaterial roughness={0.8} />
      </instancedMesh>
      <instancedMesh ref={carBody} args={[null, null, cars.length]} castShadow frustumCulled={false}>
        <boxGeometry args={[0.18, 0.09, 0.36]} />
        <meshStandardMaterial roughness={0.35} metalness={0.4} />
      </instancedMesh>
      <instancedMesh ref={carTop} args={[null, null, cars.length]} castShadow frustumCulled={false}>
        <boxGeometry args={[0.16, 0.08, 0.18]} />
        <meshStandardMaterial color="#9fc6dc" roughness={0.1} metalness={0.6} />
      </instancedMesh>
    </group>
  )
}
