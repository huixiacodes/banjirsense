import { useEffect, useRef } from 'react'
import * as THREE from 'three-vanta' // Vanta is built against three r134, so it gets its own copy
import vantaClouds from 'vanta/dist/vanta.clouds.min'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { scrollToId } from '../hooks/useSmoothScroll'

// Vanta ships as UMD/CommonJS; depending on the bundler the function sits on .default.
const CLOUDS = vantaClouds.default ?? vantaClouds

const CALM = new THREE.Color('#68b8d7')
const STORM = new THREE.Color('#2c3a4a')

export default function Hero() {
  const root = useRef()
  const bg = useRef()
  const effect = useRef()

  useEffect(() => {
    effect.current = CLOUDS({
      el: bg.current,
      THREE,
      mouseControls: true,
      touchControls: true,
      gyroControls: false,
      skyColor: CALM.getHex(),
      cloudColor: 0xadc1de,
      cloudShadowColor: 0x183550,
      sunColor: 0xff9919,
      sunGlareColor: 0xff6633,
      sunlightColor: 0xff9933,
      speed: 1.1,
    })
    return () => effect.current?.destroy()
  }, [])

  useGSAP(
    () => {
      const tl = gsap.timeline({ defaults: { ease: 'power4.out' } })
      tl.from('.hero-eyebrow', { y: 20, opacity: 0, duration: 0.8 })
        .from('.hero-title .word', { yPercent: 110, duration: 1.1, stagger: 0.08 }, '-=0.4')
        .from('.hero-sub', { y: 30, opacity: 0, duration: 0.9 }, '-=0.6')
        .from('.hero-cta > *', { y: 20, opacity: 0, stagger: 0.1, duration: 0.7 }, '-=0.5')

      // The sky turns stormy as you scroll away from the hero.
      const c = new THREE.Color()
      ScrollTrigger.create({
        trigger: root.current,
        start: 'top top',
        end: 'bottom top',
        scrub: true,
        onUpdate: (self) => {
          c.copy(CALM).lerp(STORM, self.progress)
          effect.current?.setOptions({ skyColor: c.getHex(), speed: 1.1 + self.progress * 2 })
        },
      })
      gsap.to('.hero-inner', {
        yPercent: 30,
        opacity: 0,
        ease: 'none',
        scrollTrigger: { trigger: root.current, start: 'top top', end: 'bottom top', scrub: true },
      })
    },
    { scope: root },
  )

  const words = 'Every minute of warning matters.'.split(' ')
  return (
    <header ref={root} className="hero">
      <div ref={bg} className="hero-bg" />
      <div className="hero-inner">
        <span className="hero-eyebrow">BanjirSense · IoT + 5G flood early warning for Malaysia</span>
        <h1 className="hero-title">
          {words.map((w, i) => (
            <span className="mask" key={i}>
              <span className="word">{w}</span>
            </span>
          ))}
        </h1>
        <p className="hero-sub">
          River sensors talk to the network. The network talks to every phone in the danger zone, in Bahasa
          Melayu, English, 中文 and தமிழ், before the water reaches the door.
        </p>
        <div className="hero-cta">
          <button className="btn-primary" onClick={() => scrollToId('map')}>
            Run the live demo
          </button>
          <button className="btn-ghost light" onClick={() => scrollToId('problem')}>
            Why it matters ↓
          </button>
        </div>
      </div>
    </header>
  )
}
