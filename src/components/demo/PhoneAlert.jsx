import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { LANGS, alertText } from '../../i18n/alerts'
import { setApp, useApp } from '../../sim/store'

/** Cell-broadcast style alert on a phone, in the language the user picked. */
export default function PhoneAlert({ station, status, clock, className = '', alwaysShow = false }) {
  const ref = useRef()
  const { lang } = useApp()
  const visible = !!station && (alwaysShow || status !== 'NORMAL')
  const shownFor = useRef(null)

  useEffect(() => {
    const key = visible ? `${station.id}:${status}` : null
    if (key === shownFor.current) return
    shownFor.current = key
    if (!visible) gsap.to(ref.current, { y: 40, autoAlpha: 0, duration: 0.4 })
    else
      gsap.fromTo(
        ref.current,
        { y: 60, autoAlpha: 0, scale: 0.92 },
        { y: 0, autoAlpha: 1, scale: 1, duration: 0.8, ease: 'back.out(1.6)' },
      )
  }, [visible, status, station])

  const shown = status === 'NORMAL' && !alwaysShow ? 'ALERT' : status
  const text = station ? alertText(lang, shown, station) : null
  return (
    <div ref={ref} className={`phone ${className}`} aria-live="polite">
      <div className="phone-notch" />
      <div className="phone-time">{clock.split(' ')[1]}</div>
      {text && (
        <div className={`cb cb-${shown.toLowerCase()}`}>
          <div className="cb-head">
            <span className="cb-icon">⚠</span>
            <span>{shown === 'NORMAL' ? 'River status' : 'Emergency alert'} · {text.level}</span>
          </div>
          <div className="cb-title">{shown === 'NORMAL' ? 'BanjirSense' : text.title}</div>
          <p>{text.body}</p>
          <div className="cb-langs">
            {LANGS.map((l) => (
              <button key={l.id} className={l.id === lang ? 'on' : ''} onClick={() => setApp({ lang: l.id })}>
                {l.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
