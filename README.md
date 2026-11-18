# 🌊 BanjirSense

**An IoT + 5G flood early-warning concept for Malaysia, built as an interactive scroll story in React.**

River gauges upstream detect a surge hours before it reaches the taman downstream. BanjirSense shows how a
telco network can turn that reading into a cell-broadcast alert on every phone in the danger zone, in
Bahasa Melayu, English, 中文 and தமிழ், before the first home floods.

> Prototype. **Live mode** shows real river levels from JPS; **Simulation mode** runs a fictional monsoon to demo alerts and evacuation.

## Sections

1. **Hero → problem → how it works**: the story, with scroll animations
2. **3D map of Malaysia**: all 16 states and federal territories extruded in 3D, with 37 gauges on 14 real rivers (Sg. Klang, Sg. Kelantan, Sg. Pahang, Batang Rajang, Sg. Padas…). Run the monsoon and watch states change colour as their rivers rise. Click a state to see its gauges.
3. **Your location**: type any of Malaysia's 2,929 postcodes. It finds your town and nearest gauge and shows your alert in BM, English, 中文 or தமிழ். Turn on alerts and the device gets a **system notification, a siren and a vibration** as the level escalates.
4. **Valley view**: zoom into any river: real gauge towns placed along a stylised 3D valley with homes, a 5G site and an evacuation route.

## The valley demo

Pick a river and press **⛈ Simulate monsoon**. Over 72 simulated hours:

- rain intensifies, the sky darkens and lightning flashes
- four river gauges move from **NORMAL → ALERT → WARNING → DANGER** (JPS-style alert levels)
- the first upstream WARNING triggers a **5G cell broadcast** (rings pulse from the tower) and shows the green evacuation route to the PPS
- the phone mock-up shows the alert, cycling through four languages, and escalates to an evacuation order
- floodwater rises over the kampung and roofs turn red as homes flood
- residents walk and drive along the riverside roads, over the bridge and up the green route to the PPS
- flip **With BanjirSense / No warning**: without the alert, nobody leaves until water is at the door and they end up stranded on rooftops (Klang: 165 safe vs 139 trapped)
- the stats panel shows the **warning lead time** gained (≈7.5 h in this scenario)

Use the slider to scrub back and forth through the event.

## Tech and where each library is used

| Library | Used for |
| --- | --- |
| [react-three-fiber](https://github.com/pmndrs/react-three-fiber) + drei | The 3D valley: procedural terrain, shader water, instanced houses, rain, sensors, 5G tower |
| [Vanta](https://github.com/tengbao/vanta) | Hero cloud sky, which turns stormy as you scroll |
| [ShaderGradient](https://github.com/ruucm/shadergradient) | Animated floodwater-coloured background in the "problem" section |
| [GSAP](https://github.com/greensock/GSAP) + ScrollTrigger | Hero intro, scroll reveals, count-ups, the simulation clock and phone alert animation |
| [Lenis](https://github.com/darkroomengineering/lenis) | Smooth scrolling, synced with ScrollTrigger |
| [liquid-glass-js](https://github.com/dashersw/liquid-glass-js) | Refractive glass buttons in the closing section (vendored in `src/vendor/liquid-glass`, MIT) |

## Live mode (real JPS data)

`api/jps.js` is a Vercel serverless function. It fetches the latest readings that
[JPS Public InfoBanjir](https://publicinfobanjir.water.gov.my) publishes for its own map,
keeps water-level stations updated in the last 6 hours (~700 stations), and returns compact JSON with a
CORS header (JPS doesn't send one, so browsers can't call it directly). Vercel's CDN caches it for 5 minutes.

- **Map**: every live station as a pillar coloured by its official status (Normal / Alert / Warning / Danger).
  A state is coloured only when raised levels are widespread (at least 2 stations or 8% of them).
- **Your location**: nearest live station within 40 km of your postcode. When its status rises, you get the
  notification + siren + vibration.
- **Valley view** is always a simulation.

During `npm run dev`, a small Vite plugin (in `vite.config.js`) serves the same function locally.

This is an unofficial view of JPS's public data. JPS's site is the authoritative source; ask JPS before any
public or commercial use. If JPS is down or in maintenance, the site says so and the simulation still works.

## Data sources

| Data | Source | Licence |
| --- | --- | --- |
| State boundaries | [geoBoundaries](https://www.geoboundaries.org) gbOpen MYS ADM1 | CC BY 4.0 |
| Postcode → town → state | [`malaysia-postcodes`](https://github.com/AsyrafHussin/npm-malaysia-postcodes) | ISC |
| Live river levels | Jabatan Pengairan dan Saliran (JPS), Public InfoBanjir | © JPS |
| Town coordinates | [GeoNames](https://www.geonames.org) via [`cities.json`](https://www.npmjs.com/package/cities.json) | CC BY 4.0 |

`scripts/build-data.mjs` turns these into `public/data/states.json` and `public/data/postcodes.json`
(about 95 KB together). Towns GeoNames doesn't list borrow the coordinates of the nearest postcode in the
same state and are flagged as approximate.

## Notifications

Click **Turn on alerts** (browsers only allow sound and permission prompts after a click). Then:

- **Notification**: shown through a service worker (`public/sw.js`), so it also works on Android Chrome
- **Siren**: generated with the Web Audio API, a different pattern per level
- **Vibration**: Android only (iOS Safari doesn't support the Vibration API)

Notifications need `localhost` or HTTPS.

## Architecture

```
src/
  api/jps.js           (repo root) Vercel function: live JPS readings → compact JSON
  api/live.js          polls /api/jps, nearest live station
  api/regions.js       real rivers + gauge towns per state, scenario severity/timing
  api/stations.js      mock telemetry API: the only layer you'd swap for a real feed
  api/postcodes.js     postcode → town → nearest gauge
  i18n/alerts.js       alert text in BM / EN / 中文 / தமிழ்
  alerts/              notification + siren + vibration, and the watcher that fires them
  components/map/      3D extruded Malaysia map
  sim/flood.js         the whole flood event as a pure function of progress (0 → 1)
  sim/terrain.js       procedural valley shared by the 3D scene and the flood logic
  sim/store.js         GSAP-driven simulation clock; the 3D scene reads it per frame, the HUD at 20 fps
  components/demo/     R3F scene + HUD
  components/          Hero, Problem, HowItWorks, Impact
```

Because the event is a pure function of `progress`, playing, pausing and scrubbing all stay in sync without
extra state. The 3D scene reads the clock inside `useFrame`, so the simulation never forces a React re-render.

## Run it

```bash
npm install
npm run dev
```

To rebuild the map/postcode data: `node scripts/build-data.mjs`

## Notes

- `three-vanta` is an alias for three r134, because Vanta is built against that version.
- `src/vendor/shadergradient-compat.js` registers a few shader chunks that newer three.js removed, so ShaderGradient compiles.
- liquid-glass-js refracts an html2canvas snapshot of the page, so it's used over DOM content, not over the live WebGL scenes.
