import { pause, setApp, useApp } from '../sim/store'
import { timeAgo } from '../api/live'

/** Live JPS data ⇄ monsoon simulation. One global switch shared by every section. */
export default function ModeSwitch({ className = '' }) {
  const { mode, live, liveError, liveLoading } = useApp()
  const goLive = () => {
    pause()
    setApp({ mode: 'live' })
  }
  return (
    <div className={`mode-switch ${className}`}>
      <div className="seg">
        <button className={mode === 'live' ? 'on is-live' : ''} onClick={goLive}>
          <span className="dot" /> Live · JPS
        </button>
        <button className={mode === 'sim' ? 'on' : ''} onClick={() => setApp({ mode: 'sim' })}>
          Simulation
        </button>
      </div>
      <span className="mode-note">
        {mode === 'sim'
          ? 'Simulated monsoon scenario'
          : liveError
            ? `Live data unavailable (${liveError})`
            : liveLoading || !live
              ? 'Connecting to JPS…'
              : `${live.count} stations · updated ${timeAgo(live.fetchedAt)}`}
      </span>
    </div>
  )
}
