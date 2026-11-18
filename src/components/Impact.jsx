import { useRef, useState, useEffect } from 'react'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'
import LiquidGlassButton from './LiquidGlassButton'
import { scrollToId } from '../hooks/useSmoothScroll'
import { useInView } from '../hooks/useInView'
import { AUTHOR, GITHUB_URL } from '../config'

export default function Impact() {
  const root = useRef()
  const near = useInView(root, '300px')
  const [mountGlass, setMountGlass] = useState(false)

  // Create the glass only once the page above has laid out, so its snapshot is accurate.
  useEffect(() => {
    if (near && !mountGlass) {
      const t = setTimeout(() => setMountGlass(true), 300)
      return () => clearTimeout(t)
    }
  }, [near, mountGlass])

  useGSAP(
    () => {
      gsap.from('.impact-copy > *', {
        y: 40,
        opacity: 0,
        stagger: 0.12,
        duration: 0.9,
        scrollTrigger: { trigger: root.current, start: 'top 70%' },
      })
      gsap.to('.blob', {
        xPercent: 'random(-30, 30)',
        yPercent: 'random(-30, 30)',
        duration: 6,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        stagger: 0.8,
      })
    },
    { scope: root },
  )

  return (
    <section ref={root} className="impact">
      <div className="impact-bg">
        <span className="blob b1" />
        <span className="blob b2" />
        <span className="blob b3" />
        <div className="impact-watermark">LEBIH AWAL · LEBIH SELAMAT</div>
      </div>
      <div className="impact-copy">
        <span className="eyebrow">Why a telco</span>
        <h2>The network is already everywhere the water goes.</h2>
        <p>
          Towers on every hill and a phone in every pocket. BanjirSense connects river data to that reach, so
          a reading upstream becomes a warning downstream in seconds.
        </p>
        <div className="impact-actions">
          {mountGlass && (
            <>
              <LiquidGlassButton text="↺ Run the demo again" onClick={() => scrollToId('demo')} />
              <LiquidGlassButton text="View the code" onClick={() => window.open(GITHUB_URL, '_blank', 'noopener')} />
            </>
          )}
        </div>
      </div>
      <footer className="footer">
        <span>Built by {AUTHOR}</span>
        <span>
          BanjirSense prototype · water levels are simulated · official flood info:{' '}
          <a href="https://publicinfobanjir.water.gov.my" target="_blank" rel="noopener">
            publicinfobanjir.water.gov.my
          </a>
        </span>
      </footer>
    </section>
  )
}
