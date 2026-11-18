// Equirectangular projection centred on Malaysia. Like most printed maps of
// Malaysia, Borneo is pulled west (an "inset") so both halves fit on screen.
export const K = 1.8
const CENTER = [107.45, 4.1]
const BORNEO = new Set(['swk', 'sbh', 'lbn'])
const BORNEO_SHIFT = 4 // degrees of longitude

export const project = (lng, lat, stateId) => [
  (lng - (BORNEO.has(stateId) ? BORNEO_SHIFT : 0) - CENTER[0]) * K,
  -(lat - CENTER[1]) * K,
]

let cache = null
export function loadStates() {
  cache ??= fetch('/data/states.json').then((r) => r.json())
  return cache
}
