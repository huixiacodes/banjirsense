import { useEffect, useRef } from 'react'
import { Button, Container } from '../vendor/liquid-glass/liquid-glass'

/**
 * React wrapper around liquid-glass-js's Button.
 * The library refracts a snapshot of the page taken by html2canvas, so it looks
 * best over regular DOM content (gradients, text), not over live WebGL canvases.
 */
export default function LiquidGlassButton({ text, size = 22, type = 'pill', tintOpacity = 0.25, onClick }) {
  const host = useRef()
  const clickRef = useRef(onClick)
  clickRef.current = onClick

  useEffect(() => {
    const button = new Button({ text, size, type, tintOpacity, warp: true, onClick: () => clickRef.current?.() })
    host.current.appendChild(button.element)
    return () => {
      // The library has no destroy(); stop its render loop and detach it.
      button.gl = null
      button.gl_refs.gl = null
      Container.waitingForSnapshot = Container.waitingForSnapshot.filter((b) => b !== button)
      button.element.remove()
      const i = Container.instances.indexOf(button)
      if (i > -1) Container.instances.splice(i, 1)
    }
  }, [text, size, type, tintOpacity])

  return <div ref={host} className="lg-host" />
}
