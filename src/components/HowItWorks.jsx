import { useRef } from 'react'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'

const STEPS = [
  {
    n: '01',
    title: 'Sense',
    tag: 'NB-IoT river gauges',
    body: 'Low-power ultrasonic level sensors on bridges and riverbanks report every minute over NB-IoT, running for years on a battery.',
  },
  {
    n: '02',
    title: 'Predict',
    tag: 'Edge + cloud analytics',
    body: 'Upstream readings plus rainfall estimate when the surge will reach each taman downstream, giving hours of warning instead of minutes.',
  },
  {
    n: '03',
    title: 'Alert',
    tag: '5G cell broadcast',
    body: 'One message reaches every phone connected to the affected cell sites in seconds. No app, no sign-up, and it still works when networks are congested.',
  },
  {
    n: '04',
    title: 'Guide',
    tag: 'Route to the nearest PPS',
    body: 'The alert links to a live route to the nearest evacuation centre (PPS) on high ground, updated as roads go under.',
  },
]

export default function HowItWorks() {
  const root = useRef()

  useGSAP(
    () => {
      gsap.from('.how-head > *', {
        y: 40,
        opacity: 0,
        stagger: 0.12,
        duration: 0.9,
        scrollTrigger: { trigger: root.current, start: 'top 70%' },
      })
      gsap.from('.step', {
        y: 80,
        opacity: 0,
        rotateX: -12,
        stagger: 0.15,
        duration: 1,
        ease: 'power3.out',
        scrollTrigger: { trigger: '.steps', start: 'top 80%' },
      })
      gsap.fromTo(
        '.signal-line',
        { scaleX: 0 },
        { scaleX: 1, ease: 'none', scrollTrigger: { trigger: '.steps', start: 'top 75%', end: 'bottom 50%', scrub: true } },
      )
    },
    { scope: root },
  )

  return (
    <section ref={root} className="how">
      <div className="how-head">
        <span className="eyebrow">How it works</span>
        <h2>From a rising river to every phone in range.</h2>
      </div>
      <div className="steps">
        <div className="signal-line" />
        {STEPS.map((s) => (
          <article className="step glass" key={s.n}>
            <span className="step-n">{s.n}</span>
            <h3>{s.title}</h3>
            <span className="step-tag">{s.tag}</span>
            <p>{s.body}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
