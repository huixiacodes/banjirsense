// Procedural river valley used by both the 3D scene and the simulation,
// so "is this house under water?" is answered from the same heights you see.

export const TERRAIN = { width: 44, depth: 32, segX: 176, segZ: 128 }
export const RIVER_BED = -1.1

export const riverZ = (x) => 2.6 * Math.sin(x * 0.17) + 0.8 * Math.sin(x * 0.41 + 1.3)

const smooth = (a, b, t) => {
  const k = Math.min(1, Math.max(0, (t - a) / (b - a)))
  return k * k * (3 - 2 * k)
}

/** Ground height at (x, z). */
export function heightAt(x, z) {
  const d = Math.abs(z - riverZ(x))
  // Wide, shallow floodplain that slowly climbs into hills.
  let h = 0.18 * Math.pow(Math.max(d - 1.6, 0), 1.25)
  h += smooth(4, 12, d) * (0.9 * Math.sin(x * 0.31 + z * 0.12) + 0.6 * Math.cos(z * 0.45 - x * 0.08))
  // River channel.
  h -= (1 - smooth(0.6, 2.0, d)) * 1.3
  // High ground where the evacuation centre (PPS) sits.
  const px = x - 13, pz = z + 9.5
  h += 3.2 * Math.exp(-(px * px + pz * pz) / 22)
  return Math.max(h, RIVER_BED)
}

/** Deterministic pseudo-random so the town looks the same on every load. */
export function rng(seed) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

/** Generate house positions on the floodplain. */
export function makeHouses() {
  const rand = rng(7)
  const houses = []
  for (let gx = -19; gx <= 19; gx += 1.35) {
    for (let gz = -14; gz <= 14; gz += 1.35) {
      const x = gx + (rand() - 0.5) * 0.6
      const z = gz + (rand() - 0.5) * 0.6
      const d = Math.abs(z - riverZ(x))
      if (d < 3.0 || d > 10) continue
      if (rand() < 0.38) continue
      const y = heightAt(x, z)
      if (y > 2.6) continue
      houses.push({ x, z, y, rot: rand() * Math.PI, scale: 0.75 + rand() * 0.4, hue: rand() })
    }
  }
  return houses
}

export const PPS_POSITION = [13, heightAt(13, -9.5), -9.5]
export const TOWER_POSITION = [-6, heightAt(-6, -11), -11]
