import '../vendor/shadergradient-compat'
import { useRef } from 'react'
import { ShaderGradientCanvas, ShaderGradient } from '@shadergradient/react'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'
import { useInView } from '../hooks/useInView'

// Figures for the 2021–22 floods. Double-check the latest official numbers before presenting.
const FACTS = [
  { value: 6.1, decimals: 1, prefix: 'RM', suffix: ' bil', label: 'estimated losses from the Dec 2021 floods (DOSM)' },
  { value: 8, decimals: 0, prefix: '', suffix: ' states', label: 'hit in that single event, Klang Valley included' },
  { value: 0, decimals: 0, prefix: '', suffix: ' apps', label: 'needed to receive a cell-broadcast alert' },
]

export default function Problem() {
  const root = useRef()
  const inView = useInView(root)

  useGSAP(
    () => {
      gsap.from('.problem-copy > *', {
        y: 50,
        opacity: 0,
        stagger: 0.15,
        duration: 1,
        ease: 'power3.out',
        scrollTrigger: { trigger: root.current, start: 'top 65%' },
      })
      gsap.utils.toArray('.fact b').forEach((el) => {
        const { value, decimals, prefix, suffix } = el.dataset
        const obj = { v: 0 }
        gsap.to(obj, {
          v: Number(value),
          duration: 2,
          ease: 'power2.out',
          scrollTrigger: { trigger: el, start: 'top 85%' },
          onUpdate: () => (el.textContent = prefix + obj.v.toFixed(Number(decimals)) + suffix),
        })
      })
    },
    { scope: root },
  )

  return (
    <section id="problem" ref={root} className="problem">
      <div className="problem-bg">
        {inView && (
          <ShaderGradientCanvas style={{ position: 'absolute', inset: 0 }} pixelDensity={1} fov={45} pointerEvents="none">
            <ShaderGradient
              control="props"
              type="waterPlane"
              animate="on"
              uSpeed={0.25}
              uStrength={2.6}
              uDensity={1.4}
              uFrequency={5.5}
              uAmplitude={1}
              color1="#3a7ca5"
              color2="#b07a43"
              color3="#16324a"
              cAzimuthAngle={180}
              cPolarAngle={80}
              cDistance={2.8}
              rotationX={50}
              rotationZ={-60}
              lightType="3d"
              brightness={1.3}
              grain="on"
              reflection={0.1}
            />
          </ShaderGradientCanvas>
        )}
      </div>
      <div className="problem-copy">
        <span className="eyebrow">The problem</span>
        <h2>
          Floods come every monsoon.
          <br />
          <em>The warning often doesn't.</em>
        </h2>
        <p>
          In December 2021, residents of Taman Sri Muda, Shah Alam, watched water reach their rooftops within
          hours. Many said they had little or no warning. Upstream gauges see a surge hours before it arrives
          downstream. The gap is getting that reading to the right phones fast enough.
        </p>
        <div className="facts">
          {FACTS.map((f) => (
            <div className="fact" key={f.label}>
              <b data-value={f.value} data-decimals={f.decimals} data-prefix={f.prefix} data-suffix={f.suffix}>
                {f.prefix}0{f.suffix}
              </b>
              <span>{f.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
