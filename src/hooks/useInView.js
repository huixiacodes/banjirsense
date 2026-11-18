import { useEffect, useState } from 'react'

/** True while the element is within `margin` of the viewport. Used to pause/unmount heavy WebGL scenes. */
export function useInView(ref, margin = '200px') {
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { rootMargin: margin })
    io.observe(el)
    return () => io.disconnect()
  }, [ref, margin])
  return inView
}
