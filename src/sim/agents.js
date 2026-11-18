// Residents and cars in the valley, and how they evacuate.
// Like the flood itself, every agent's state is a pure function of `progress`,
// so play / pause / scrub always agree.
import { heightAt, riverZ, rng, PPS_POSITION } from './terrain.js'
import { waterLevelAt } from './flood.js'

const BANK = 2.6 // riverside road distance from the river centre line
const BRIDGE_X = 0
const ROUTE_START_X = 4

// --- shared road network -------------------------------------------------
const ground = (x, z, lift = 0.02) => [x, heightAt(x, z) + lift, z]
const bankZ = (x, side) => riverZ(x) + side * BANK // side: +1 south bank, -1 north bank

/** Points along a bank road from x0 to x1 (inclusive), ~1 unit apart. */
function bankRoad(x0, x1, side) {
  const n = Math.max(1, Math.ceil(Math.abs(x1 - x0)))
  return Array.from({ length: n + 1 }, (_, i) => {
    const x = x0 + ((x1 - x0) * i) / n
    return ground(x, bankZ(x, side))
  })
}

const southEnd = ground(BRIDGE_X, bankZ(BRIDGE_X, 1))
const northEnd = ground(BRIDGE_X, bankZ(BRIDGE_X, -1))
export const BRIDGE = {
  x: BRIDGE_X,
  z0: southEnd[2],
  z1: northEnd[2],
  deck: Math.max(southEnd[1], northEnd[1]) + 0.3,
}

const bridgePath = [
  southEnd,
  [BRIDGE_X, BRIDGE.deck, southEnd[2] - 0.7],
  [BRIDGE_X, BRIDGE.deck, northEnd[2] + 0.7],
  northEnd,
]

// Uphill route to the PPS (same curve the green dashed line follows).
function catmull(points, segments) {
  const out = []
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[i + 2] ?? p2
    for (let s = 0; s < segments; s++) {
      const t = s / segments
      const t2 = t * t, t3 = t2 * t
      const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3)
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])])
    }
  }
  out.push(points[points.length - 1])
  return out
}
const ROUTE_CTRL = [
  [ROUTE_START_X, bankZ(ROUTE_START_X, -1)],
  [ROUTE_START_X, -3.5],
  [7, -5.5],
  [9.5, -6.5],
  [11.5, -8.2],
  [PPS_POSITION[0] - 0.8, PPS_POSITION[2] + 0.6],
]
export const ROUTE = catmull(ROUTE_CTRL, 10).map(([x, z]) => ground(x, z))

/** Road polylines to draw (both bank roads + bridge). */
export const ROADS = {
  south: bankRoad(-20, 20, 1),
  north: bankRoad(-20, 20, -1),
  bridge: bridgePath,
}

// --- agents ---------------------------------------------------------------
function pathFor(home, side) {
  // start at the front door (the river-facing side of the house)
  const doorZ = home.z - side * 0.55
  const pts = [ground(home.x, doorZ)]
  if (side === 1) {
    pts.push(...bankRoad(home.x, BRIDGE_X, 1), ...bridgePath.slice(1), ...bankRoad(BRIDGE_X, ROUTE_START_X, -1).slice(1))
  } else {
    pts.push(...bankRoad(home.x, ROUTE_START_X, -1))
  }
  pts.push(...ROUTE.slice(1))
  return pts
}

function withLengths(points) {
  const cum = [0]
  for (let i = 1; i < points.length; i++) {
    const [ax, ay, az] = points[i - 1]
    const [bx, by, bz] = points[i]
    cum.push(cum[i - 1] + Math.hypot(bx - ax, by - ay, bz - az))
  }
  return { points, cum, length: cum[cum.length - 1] }
}

/** Point + heading at distance d along a path. */
export function along(path, d) {
  const { points, cum } = path
  if (d <= 0) return { pos: points[0], dir: 0 }
  if (d >= path.length) {
    const a = points[points.length - 2], b = points[points.length - 1]
    return { pos: b, dir: Math.atan2(b[0] - a[0], b[2] - a[2]) }
  }
  let i = 1
  while (cum[i] < d) i++
  const t = (d - cum[i - 1]) / (cum[i] - cum[i - 1] || 1)
  const a = points[i - 1], b = points[i]
  return {
    pos: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t],
    dir: Math.atan2(b[0] - a[0], b[2] - a[2]),
  }
}

export function makeAgents(houses) {
  const rand = rng(42)
  const agents = []
  houses.forEach((h, i) => {
    const side = h.z > riverZ(h.x) ? 1 : -1
    const make = (kind) => {
      // spread arrivals around the PPS so they don't stack on one spot
      const a = rand() * Math.PI * 2
      const r = 1.1 + rand() * 1.4
      const slot = [PPS_POSITION[0] + Math.cos(a) * r, 0, PPS_POSITION[2] + Math.sin(a) * r * 0.8]
      slot[1] = heightAt(slot[0], slot[2]) + 0.02
      const path = withLengths([...pathFor(h, side), slot])
      return { id: agents.length, kind, house: i, home: h, side, path, seed: rand(), hue: rand() }
    }
    if (rand() < 0.6) agents.push(make('person'))
    if (rand() < 0.2) agents.push(make('person'))
    if (rand() < 0.2) agents.push(make('car'))
  })
  return agents
}

// Speeds in scene units per unit of progress (1 progress = 72 h, so these are "fast-forwarded").
const SPEED = { person: 700, car: 1800 }
const CLEARANCE = { person: 0.12, car: 0.16 }

/**
 * Work out when each agent leaves, and whether/where the water catches them.
 * warning=true: residents leave after the cell broadcast (staggered as people react).
 * warning=false: nobody knows until water is at their door.
 */
export function planEvacuation(agents, region, broadcastP, warning) {
  const level = (p) => waterLevelAt(p, region)
  return agents.map((ag) => {
    const homeY = ag.path.points[0][1]
    const floodsHomeAt = firstTime((p) => level(p) > homeY + 0.02)
    let depart = null
    if (warning && broadcastP <= 1) {
      depart = broadcastP + 0.004 + ag.seed * (ag.kind === 'car' ? 0.02 : 0.035)
      if (floodsHomeAt !== null && floodsHomeAt < depart) depart = floodsHomeAt
    } else if (floodsHomeAt !== null) {
      depart = floodsHomeAt
    }
    if (depart === null) return { depart: null }
    const duration = ag.path.length / SPEED[ag.kind]
    // walk forward in time; trapped the moment water at our position is too deep
    for (let p = depart; p <= 1; p += 0.0015) {
      const d = Math.min(1, (p - depart) / duration) * ag.path.length
      const y = along(ag.path, d).pos[1]
      if (level(p) > y + CLEARANCE[ag.kind]) return { depart, duration, trappedAt: p, trappedDist: d }
      if (d >= ag.path.length) return { depart, duration, arrivedAt: p }
    }
    return { depart, duration, arrivedAt: depart + duration }
  })
}

function firstTime(test) {
  for (let i = 0; i <= 1000; i++) if (test(i / 1000)) return i / 1000
  return null
}

/** 'home' | 'moving' | 'safe' | 'trapped', plus distance along the path. */
export function agentState(ag, plan, p) {
  if (plan.depart === null || p < plan.depart) return { state: 'home', dist: 0 }
  if (plan.trappedAt !== undefined && p >= plan.trappedAt) return { state: 'trapped', dist: plan.trappedDist }
  const d = Math.min(1, (p - plan.depart) / plan.duration) * ag.path.length
  if (plan.arrivedAt !== undefined && p >= plan.arrivedAt) return { state: 'safe', dist: ag.path.length }
  return { state: 'moving', dist: d }
}

export function countStates(agents, plans, p) {
  const c = { home: 0, moving: 0, safe: 0, trapped: 0 }
  agents.forEach((ag, i) => c[agentState(ag, plans[i], p).state]++)
  return c
}
