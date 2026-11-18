import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { TERRAIN } from '../../sim/terrain'
import { rainAt, waterLevelAt, floodShape } from '../../sim/flood'
import { sim } from '../../sim/store'

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uRough;
  varying vec2 vUv;
  varying float vWave;
  void main() {
    vUv = uv;
    vec3 p = position;
    float w = sin(p.x * 1.3 + uTime * 1.6) * 0.5 + sin(p.y * 1.7 - uTime * 1.2) * 0.5;
    w += sin((p.x + p.y) * 3.1 + uTime * 3.0) * 0.25 * uRough;
    p.z += w * (0.03 + 0.06 * uRough);
    vWave = w;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`

const fragmentShader = /* glsl */ `
  uniform float uMud;
  uniform float uTime;
  varying vec2 vUv;
  varying float vWave;
  void main() {
    vec3 clear = vec3(0.16, 0.52, 0.62);
    vec3 muddy = vec3(0.45, 0.33, 0.20);
    vec3 col = mix(clear, muddy, uMud);
    float streak = smoothstep(0.75, 1.0, sin(vUv.x * 120.0 + uTime * 2.0 + vWave * 3.0));
    col += streak * 0.06;
    col += vWave * 0.04;
    gl_FragColor = vec4(col, mix(0.82, 0.92, uMud));
  }
`

export default function Water({ region }) {
  const mesh = useRef()
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uMud: { value: 0 }, uRough: { value: 0 } }), [])

  useFrame((_, dt) => {
    const p = sim.progress
    uniforms.uTime.value += dt
    uniforms.uMud.value = THREE.MathUtils.lerp(uniforms.uMud.value, Math.min(1, floodShape(p, region.lag + 0.03) * region.severity * 1.4), 0.05)
    uniforms.uRough.value = rainAt(p, region)
    mesh.current.position.y = waterLevelAt(p, region)
  })

  return (
    <mesh ref={mesh} rotation-x={-Math.PI / 2} renderOrder={2}>
      <planeGeometry args={[TERRAIN.width - 0.2, TERRAIN.depth - 0.2, 110, 80]} />
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
      />
    </mesh>
  )
}
