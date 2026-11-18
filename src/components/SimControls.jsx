import { play, pause, reset, seek, useSimProgress } from '../sim/store'

/** Play / pause / reset / scrub. Every section shares the same simulation clock. */
export default function SimControls({ className = '' }) {
  const { progress, playing } = useSimProgress()
  return (
    <div className={`sim-controls ${className}`}>
      <button className="btn-primary" onClick={playing ? pause : play}>
        {playing ? 'Pause' : progress > 0 && progress < 1 ? 'Resume' : '⛈ Simulate monsoon'}
      </button>
      <button className="btn-ghost" onClick={reset}>
        Reset
      </button>
      <input
        type="range"
        min={0}
        max={1000}
        value={Math.round(progress * 1000)}
        onChange={(e) => seek(e.target.value / 1000)}
        aria-label="Scrub through the flood event"
      />
    </div>
  )
}
