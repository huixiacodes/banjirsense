import Hero from './components/Hero'
import Problem from './components/Problem'
import HowItWorks from './components/HowItWorks'
import MalaysiaMap from './components/map/MalaysiaMap'
import YourLocation from './components/location/YourLocation'
import FloodDemo from './components/demo/FloodDemo'
import Impact from './components/Impact'
import AlertWatcher from './alerts/AlertWatcher'
import { useSmoothScroll } from './hooks/useSmoothScroll'
import { useLiveData } from './api/live'

export default function App() {
  useSmoothScroll()
  useLiveData()
  return (
    <main>
      <Hero />
      <Problem />
      <HowItWorks />
      <MalaysiaMap />
      <YourLocation />
      <FloodDemo />
      <Impact />
      <AlertWatcher />
    </main>
  )
}
