# 7:00 AM

A first-person horror game about a time loop. Owen Hale wakes up at 7:00 AM and has to catch the 7:40 bus.
He dies before he gets there, horribly, and wakes up at 7:00 again. Every death can be avoided, and every
morning he survives longer, the world gets more wrong, and a man with no face gets closer.

Play: `node serve.js`, then open http://localhost:8080 in Chrome. No build step; Three.js 0.160 loads from a CDN.

## Files
- `js/world.js` — the apartment, hallway, elevator, stairwell, lobby, alley, street, shop and bus stop, built from
  boxes. Static boxes are merged by material in 12 m cells at load (`mergeStatic`), so ~600 boxes become a few dozen draw calls.
- `js/day.js` — the morning: every hazard and its fix, the clues, the faceless man, NPCs, the truck, the bus, how each loop changes the world.
- `js/deaths.js` — death cinematics: a first-person moment, and with Gore: Full, a third-person shot afterwards.
- `js/gore.js` — blood drops and splats (two instanced meshes, allocated once) and loose body parts.
- `js/intro.js` — the night before on Route 9 (instanced forest, rain).
- `js/people.js` — one jointed body for everyone (shared geometry, cached materials), faces painted on canvases.
- `js/main.js` — renderer, post effect, lights, player, menus, saving, sync.

## Performance
- One shadow-casting light (the sun), its shadow box follows the camera; off on Low.
- Four point lights moved to the four lamps nearest the camera.
- The bathroom mirror renders only while you're in the bathroom.
- `perf.js` lowers the render resolution when frames get slow and gives it back when they recover.

## Tests
`node tools/smoke.mjs` (looks at every area, prints draw calls), `node tools/play.mjs` (every death and two endings),
`node tools/icons.mjs` (icons and cover). They need Chrome; screenshots go to `tools/shots/`.
