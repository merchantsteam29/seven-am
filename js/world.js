// The whole morning's world, built from boxes: Owen's apartment (4B, fourth floor), the hallway, the elevator,
// the stairwell, the lobby and laundry room, the alley, Callow Street, the shop and the bus stop.
// Collision is circles against boxes; the ground is a list of flat and sloped surfaces.
import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import * as TX from './tex.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const Y4 = 12, CEIL = 2.8; // Owen's floor, room height
export const W = { colliders: [], floors: [], inter: [], doors: new Map(), fixtures: [], glass: [], meshes: {}, signs: [], scene: null, solid: [] };

// ---------- materials ----------
const M = {};
function mat(name, tex, tile = [1, 1], o = {}) {
  const m = new THREE.MeshStandardMaterial({ map: tex || null, color: o.color ?? 0xffffff, roughness: o.rough ?? 0.85, metalness: o.metal ?? 0, emissive: o.emissive ?? 0x000000, emissiveIntensity: o.ei ?? 1, transparent: !!o.transparent, opacity: o.opacity ?? 1, side: o.side ?? THREE.FrontSide });
  m.userData.tile = tile; M[name] = m; return m;
}
function makeMaterials() {
  mat('bedWall', TX.wallpaper('bedWall', 0x8a9aa8, 0x5a6a7a, 'stripe', 1), [2, 2.8]);
  mat('livWall', TX.wallpaper('livWall', 0xc8b898, 0x9a8460, 'damask', 2), [2, 2.8]);
  mat('entWall', TX.wallpaper('entWall', 0xb8b0a0, 0x8a8070, 'dots', 3), [2, 2.8]);
  mat('hallWall', TX.wallpaper('hallWall', 0x9a8a6a, 0x6a5a40, 'stripe', 4), [2, 2.8]);
  mat('bathWall', TX.tiles('bathWall', 0xd8dcd8, 0xc8d0cc, 8, 5), [1.2, 1.2]);
  mat('kitchWall', TX.tiles('kitchWall', 0xe0d8c0, 0xd0c8b0, 8, 6), [1.2, 1.2]);
  mat('wood', TX.planks('floorWood', 0x8a5a34, 2), [2, 2]);
  mat('hallFloor', TX.tiles('hallFloor', 0x6a3028, 0x3a2a24, 8, 7), [2, 2]);
  mat('bathFloor', TX.tiles('bathFloor', 0xeeeeea, 0x30343a, 10, 8), [1.5, 1.5]);
  mat('ceil', TX.plaster('ceil', 0xe8e4dc, 9), [2, 2]);
  mat('concrete', TX.concrete('conc', 0x8a8680, 10), [3, 3]);
  mat('stairWall', TX.plaster('stairWall', 0xb8c0b0, 11), [2, 2]);
  mat('brick', TX.brick('brick', 0x8a4030, 12), [2.5, 2.5]);
  mat('brick2', TX.brick('brick2', 0x6a5a50, 13), [2.5, 2.5]);
  mat('asphalt', TX.asphalt(), [4, 4], { rough: 0.95 });
  mat('paving', TX.paving(), [2, 2]);
  mat('lobbyFloor', TX.tiles('lobbyFloor', 0xd8d0c0, 0x2a2a2a, 8, 14), [2, 2]);
  mat('lobbyWall', TX.wallpaper('lobbyWall', 0x6a7a5a, 0x4a5a3a, 'damask', 15), [2, 2.8]);
  mat('darkWood', TX.wood('dwood', 0x4a2e1c, 16), [1, 1]);
  mat('lightWood', TX.wood('lwood', 0xb08a5a, 17), [1, 1]);
  mat('fabricBlue', TX.fabric('fb', 0x3a4a6a, 18), [0.5, 0.5]);
  mat('fabricRed', TX.fabric('fr', 0x7a3a30, 19), [0.5, 0.5]);
  mat('fabricGrey', TX.fabric('fg', 0x7a7a78, 20), [0.5, 0.5]);
  mat('sheet', TX.fabric('sheet', 0xe0e0d8, 21), [0.5, 0.5]);
  mat('white', null, [1, 1], { color: 0xf0f0ea, rough: 0.4 });
  mat('steel', null, [1, 1], { color: 0x9aa0a6, rough: 0.35, metal: 0.7 });
  mat('darkSteel', null, [1, 1], { color: 0x3a3e44, rough: 0.5, metal: 0.6 });
  mat('black', null, [1, 1], { color: 0x111114, rough: 0.6 });
  mat('door', TX.wood('doorW', 0x7a5236, 22), [1, 2]);
  mat('aptDoor', TX.wood('aptDoor', 0x5a3424, 23), [1, 2]);
  mat('metalDoor', null, [1, 1], { color: 0x5a6a5a, rough: 0.6, metal: 0.3 });
  mat('glass', null, [1, 1], { color: 0xa8c8e0, rough: 0.05, metal: 0.1, transparent: true, opacity: 0.18 });
  mat('frame', null, [1, 1], { color: 0xe8e4d8, rough: 0.6 });
  mat('rail', null, [1, 1], { color: 0x2a2a2a, rough: 0.5, metal: 0.5 });
  mat('grass', TX.concrete('grass', 0x3a5a2a, 24), [2, 2]);
  mat('lamp', null, [1, 1], { color: 0xfff4e0, emissive: 0xfff0d0, ei: 1.2 });
  mat('yellow', null, [1, 1], { color: 0xe8c020, rough: 0.6 });
  mat('stripe', null, [1, 1], { color: 0xe8e8e0, rough: 0.7 });
  mat('shopFloor', TX.tiles('shopFloor', 0xd8d8d0, 0xb8b8b0, 6, 25), [2, 2]);
  mat('shopWall', TX.plaster('shopWall', 0xe8e8d8, 26), [2, 2]);
  M.sky = new THREE.MeshBasicMaterial({ color: 0x9ac0e8, side: THREE.BackSide, fog: false }); M.sky.userData.tile = [1, 1];
  mat('carRed', null, [1, 1], { color: 0x6a1a1a, rough: 0.35, metal: 0.5 });
  mat('carWhite', null, [1, 1], { color: 0xe8e8e8, rough: 0.35, metal: 0.4 });
  mat('carBlue', null, [1, 1], { color: 0x1a2a5a, rough: 0.35, metal: 0.5 });
  mat('tyre', null, [1, 1], { color: 0x141414, rough: 0.9 });
  mat('carGlass', null, [1, 1], { color: 0x202830, rough: 0.1, metal: 0.6 });
  mat('blood', null, [1, 1], { color: 0x4a0404, rough: 0.3 });
  mat('leaves', TX.fabric('leaves', 0x3a6a2a, 27), [0.6, 0.6]);
  mat('bark', TX.wood('bark', 0x4a3a2a, 28), [0.5, 0.5]);
  mat('elevWall', null, [1, 1], { color: 0x8a8070, rough: 0.4, metal: 0.6 });
  mat('elevDoor', null, [1, 1], { color: 0xb0b4b8, rough: 0.3, metal: 0.8 });
  mat('busBody', null, [1, 1], { color: 0xd8d8d0, rough: 0.4, metal: 0.3 });
  mat('busStripe', null, [1, 1], { color: 0x1a5a9a, rough: 0.4 });
  mat('redLight', null, [1, 1], { color: 0x300000, emissive: 0xff2010, ei: 0 });
  mat('whiteLight', null, [1, 1], { color: 0x303030, emissive: 0xfff0e0, ei: 0 });
  return M;
}

// ---------- building blocks ----------
// a box from (x0,y0,z0) to (x1,y1,z1). UVs are scaled so textures keep their real size.
function boxGeo(w, h, d, tile) {
  const g = new THREE.BoxGeometry(w, h, d), uv = g.attributes.uv, [tu, tv] = tile;
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) { const k = f * 4 + i; uv.setXY(k, uv.getX(k) * dims[f][0] / tu, uv.getY(k) * dims[f][1] / tv); }
  return g;
}
export function B(x0, y0, z0, x1, y1, z1, m, o = {}) {
  if (x1 < x0) [x0, x1] = [x1, x0]; if (y1 < y0) [y0, y1] = [y1, y0]; if (z1 < z0) [z0, z1] = [z1, z0];
  const w = x1 - x0, h = y1 - y0, d = z1 - z0;
  const mesh = new THREE.Mesh(boxGeo(w, h, d, m.userData.tile || [1, 1]), m);
  mesh.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  mesh.castShadow = o.cast ?? (h > 0.3); mesh.receiveShadow = true; mesh.userData.static = !o.parent && !o.dyn;
  (o.parent || W.scene).add(mesh);
  if (o.collide !== false && !o.parent) W.colliders.push({ x0, x1, y0, y1, z0, z1, mesh });
  if (o.floor) W.floors.push({ x0, x1, z0, z1, y: y1 });
  return mesh;
}
// visual only
const V = (x0, y0, z0, x1, y1, z1, m, o = {}) => B(x0, y0, z0, x1, y1, z1, m, { ...o, collide: false });
function floor(x0, z0, x1, z1, y, m, thick = 0.2) { return B(x0, y - thick, z0, x1, y, z1, m, { floor: true, collide: false, cast: false }); }
function ramp(x0, z0, x1, z1, axis, a0, y0, a1, y1) { W.floors.push({ x0, x1, z0, z1, ramp: { axis, a0, y0, a1, y1 } }); }
// a wall along x (at z, thickness t centred on it), from x0 to x1, with openings: { a, b, bottom, top, door, win }
function wallX(z, x0, x1, y, m, gaps = [], t = 0.14, h = CEIL, m2 = m) {
  let x = x0; gaps = [...gaps].sort((p, q) => p.a - q.a);
  for (const gp of gaps) {
    if (gp.a > x) B(x, y, z - t / 2, gp.a, y + h, z + t / 2, gp.a - x < 0.01 ? m : m, {});
    const top = gp.top ?? 2.1, bottom = gp.bottom ?? 0;
    if (top < h) V(gp.a, y + top, z - t / 2, gp.b, y + h, z + t / 2, m);
    if (bottom > 0) B(gp.a, y, z - t / 2, gp.b, y + bottom, z + t / 2, m);
    if (gp.win) windowPane('x', z, gp.a, gp.b, y + bottom, y + top, t);
    x = gp.b;
  }
  if (x < x1) B(x, y, z - t / 2, x1, y + h, z + t / 2, m);
  void m2;
}
function wallZ(x, z0, z1, y, m, gaps = [], t = 0.14, h = CEIL) {
  let z = z0; gaps = [...gaps].sort((p, q) => p.a - q.a);
  for (const gp of gaps) {
    if (gp.a > z) B(x - t / 2, y, z, x + t / 2, y + h, gp.a, m);
    const top = gp.top ?? 2.1, bottom = gp.bottom ?? 0;
    if (top < h) V(x - t / 2, y + top, gp.a, x + t / 2, y + h, gp.b, m);
    if (bottom > 0) B(x - t / 2, y, gp.a, x + t / 2, y + bottom, gp.b, m);
    if (gp.win) windowPane('z', x, gp.a, gp.b, y + bottom, y + top, t);
    z = gp.b;
  }
  if (z < z1) B(x - t / 2, y, z, x + t / 2, y + h, z1, m);
}
// an outside wall: brick on the street side, each room's own paper inside, the same openings through both
function frontWall(z, y, rooms, gaps, t = 0.3) {
  wallX(z + t / 4, rooms[0][0], rooms[rooms.length - 1][1], y, M.brick, gaps, t / 2);
  for (const [x0, x1, m] of rooms) {
    const gs = gaps.filter((g) => g.b > x0 && g.a < x1).map((g) => ({ ...g, a: Math.max(x0, g.a), b: Math.min(x1, g.b), win: false }));
    wallX(z - t / 4, x0, x1, y, m, gs, t / 2);
  }
}
function windowPane(axis, at, a, b, y0, y1, t) {
  const g = axis === 'x' ? V(a, y0, at - 0.01, b, y1, at + 0.01, M.glass, { cast: false }) : V(at - 0.01, y0, a, at + 0.01, y1, b, M.glass, { cast: false });
  g.castShadow = false; g.receiveShadow = false; g.renderOrder = 2;
  W.glass.push(g);
  // the frame: sill, head, a mullion
  const f = 0.05;
  if (axis === 'x') { V(a, y0 - f, at - t / 2 - 0.04, b, y0, at + t / 2 + 0.04, M.frame); V(a, y1, at - t / 2, b, y1 + f, at + t / 2, M.frame); V((a + b) / 2 - 0.025, y0, at - 0.03, (a + b) / 2 + 0.025, y1, at + 0.03, M.frame); }
  else { V(at - t / 2 - 0.04, y0 - f, a, at + t / 2 + 0.04, y0, b, M.frame); V(at - t / 2, y1, a, at + t / 2, y1 + f, b, M.frame); V(at - 0.03, y0, (a + b) / 2 - 0.025, at + 0.03, y1, (a + b) / 2 + 0.025, M.frame); }
}
// a hinged door. axis 'x' = the door lies along x (in a wall at z), hinge at x = h, swinging towards +z (dir 1) or -z (-1)
function door(id, axis, at, a, b, y, m, o = {}) {
  const w = b - a, pivot = new THREE.Group(), hingeAtA = o.hinge !== 'b';
  const hx = hingeAtA ? a : b;
  if (axis === 'x') pivot.position.set(hx, y, at); else pivot.position.set(at, y, hx);
  W.scene.add(pivot);
  const th = 0.05, h = o.h ?? 2.08;
  const panel = new THREE.Mesh(boxGeo(w - 0.02, h, th, m.userData.tile), m); panel.castShadow = true; panel.receiveShadow = true;
  const sgn = hingeAtA ? 1 : -1;
  if (axis === 'x') panel.position.set(sgn * w / 2, h / 2, 0); else panel.position.set(0, h / 2, sgn * w / 2);
  if (axis === 'z') panel.rotation.y = Math.PI / 2;
  pivot.add(panel);
  // a handle on both sides
  const hm = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), M.steel);
  const hd = sgn * (w - 0.12);
  if (axis === 'x') { hm.position.set(hd, 1.0, 0.05); const h2 = hm.clone(); h2.position.z = -0.05; pivot.add(hm, h2); }
  else { hm.position.set(0.05, 1.0, hd); const h2 = hm.clone(); h2.position.x = -0.05; pivot.add(hm, h2); }
  const col = axis === 'x' ? { x0: a, x1: b, y0: y, y1: y + h, z0: at - 0.08, z1: at + 0.08 } : { x0: at - 0.08, x1: at + 0.08, y0: y, y1: y + h, z0: a, z1: b };
  W.colliders.push(col);
  const d = { id, axis, at, a, b, y, pivot, panel, col, open: false, ang: 0, target: 0, swing: (o.swing ?? 1) * sgn, locked: !!o.locked, name: o.name || 'Door', lockedText: o.lockedText || 'Locked.', label: o.label, onOpen: o.onOpen, sound: o.sound || 'wood' };
  d.cx = axis === 'x' ? (a + b) / 2 : at; d.cz = axis === 'x' ? at : (a + b) / 2;
  W.doors.set(id, d);
  W.inter.push({ id: 'door:' + id, x: d.cx, y: y + 1.1, z: d.cz, r: 1.8, door: d });
  return d;
}
export function setDoor(d, open) {
  d.open = open; d.target = open ? d.swing * 1.55 : 0;
  d.col.off = open;
}
function inter(id, x, y, z, r = 1.6) { const it = { id, x, y, z, r }; W.inter.push(it); return it; }
function fixture(x, y, z, room, o = {}) {
  const m = V(x - 0.22, y - 0.06, z - 0.22, x + 0.22, y, z + 0.22, M.lamp, { cast: false }); m.material = M.lamp.clone();
  W.fixtures.push({ x, y: y - 0.3, z, room, m, color: o.color ?? 0xffe8c8, power: o.power ?? 14, range: o.range ?? 9, on: true });
  return m;
}
function label(text, x, y, z, ry, w = 0.36, h = 0.12, o = {}) {
  const tex = TX.sign(text, { w: 256, h: Math.round(256 * h / w), bg: o.bg ?? '#d8c890', fg: o.fg ?? '#2a2018', font: o.font ?? `bold ${Math.round(256 * h / w * 0.6)}px Georgia, serif` });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, transparent: !o.bg && o.bg !== undefined, emissive: o.glow ? 0xffffff : 0, emissiveMap: o.glow ? tex : null, emissiveIntensity: o.glow ?? 0 }));
  m.position.set(x, y, z); m.rotation.y = ry; W.scene.add(m); return m;
}
const tree = (x, z) => {
  V(x - 0.12, 0, z - 0.12, x + 0.12, 3, z + 0.12, M.bark);
  const l = new THREE.Mesh(new THREE.IcosahedronGeometry(1.5, 1), M.leaves); l.position.set(x, 3.8, z); l.scale.set(1, 1.2, 1); l.castShadow = true; W.scene.add(l);
  W.colliders.push({ x0: x - 0.2, x1: x + 0.2, y0: 0, y1: 3, z0: z - 0.2, z1: z + 0.2 });
};
export function makeCar(m, len = 4.4, wid = 1.8) {
  const g = new THREE.Group();
  const add = (x0, y0, z0, x1, y1, z1, mm) => { const b = new THREE.Mesh(boxGeo(x1 - x0, y1 - y0, z1 - z0, [1, 1]), mm); b.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); b.castShadow = true; b.receiveShadow = true; g.add(b); return b; };
  const L = len / 2, Wd = wid / 2;
  add(-L, 0.3, -Wd, L, 0.85, Wd, m);
  add(-L * 0.45, 0.85, -Wd + 0.08, L * 0.35, 1.38, Wd - 0.08, M.carGlass);
  add(-L * 0.42, 1.36, -Wd + 0.1, L * 0.32, 1.42, Wd - 0.1, m);
  for (const [x, z] of [[-L * 0.62, -Wd], [L * 0.62, -Wd], [-L * 0.62, Wd], [L * 0.62, Wd]]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.24, 14), M.tyre); w.rotation.x = Math.PI / 2; w.position.set(x, 0.33, z); w.castShadow = true; g.add(w); }
  const hl = add(L - 0.02, 0.6, -Wd + 0.15, L + 0.02, 0.75, -Wd + 0.45, M.whiteLight.clone()); const hr = add(L - 0.02, 0.6, Wd - 0.45, L + 0.02, 0.75, Wd - 0.15, M.whiteLight.clone());
  g.userData.lights = [hl, hr];
  return g;
}

// ---------- the build ----------
export function buildWorld(scene) {
  W.scene = scene; makeMaterials();
  const y = Y4;
  // ===== Apartment 4B =====
  floor(-8, -6, -3, 0, y, M.wood); floor(-3, -3, 0, 0, y, M.bathFloor); floor(-3, -6, 0, -3, y, M.wood); floor(0, -6, 6, 0, y, M.wood);
  V(-8, y + CEIL, -6, 6, y + CEIL + 0.2, 0, M.ceil, { cast: false });
  // outer walls
  frontWall(0, y, [[-8, -3, M.bedWall], [-3, 0, M.bathWall], [0, 6, M.livWall]], [{ a: -7, b: -4.5, bottom: 0.9, top: 2.3, win: true }, { a: -2, b: -1, bottom: 1.5, top: 2.2, win: true }, { a: 0.8, b: 2.6, bottom: 0.8, top: 2.3, win: true }, { a: 3.4, b: 5.2, bottom: 0.8, top: 2.3, win: true }], 0.3);
  wallZ(-8, -6, 0, y, M.bedWall); wallZ(6, -6, 0, y, M.livWall);
  wallX(-6, -8, 6, y, M.hallWall, [{ a: -2.05, b: -0.95 }], 0.2);
  // inside
  wallZ(-3, -6, 0, y, M.bedWall, [{ a: -5.4, b: -4.5 }]);
  wallX(-3, -3, 0, y, M.bathWall, [{ a: -2.1, b: -1.2 }]);
  wallZ(0, -6, 0, y, M.livWall, [{ a: -5.6, b: -4.2, top: 2.3 }]);
  // room liners (a different paper on the other side of shared walls)
  V(-2.93, y, -6, -2.92, y + CEIL, -3, M.entWall, { cast: false }); V(-0.08, y, -6, -0.07, y + CEIL, -3, M.entWall, { cast: false });
  V(0.075, y, -6, 0.08, y + CEIL, 0, M.livWall, { cast: false }); V(-2.92, y, -2.93, -0.08, y + CEIL, -2.92, M.entWall, { cast: false });
  V(-2.92, y, -2.9, -0.08, y + CEIL, -2.89, M.bathWall, { cast: false });
  door('bed', 'z', -3, -5.4, -4.5, y, M.door, { hinge: 'a', swing: -1, name: 'Bedroom' });
  door('bath', 'x', -3, -2.1, -1.2, y, M.door, { swing: 1, name: 'Bathroom' });
  door('front', 'x', -6, -2.05, -0.95, y, M.aptDoor, { swing: 1, name: 'Front door', hinge: 'b' });
  label('4B', -1.5, y + 1.75, -6.11, Math.PI, 0.2, 0.12, { bg: '#c8a040', fg: '#2a1a08' });
  // --- bedroom ---
  B(-7.95, y, -2.2, -5.9, y + 0.45, 0.0 - 0.3, M.darkWood); // bed frame (head at the west wall)
  V(-7.9, y + 0.45, -2.15, -5.95, y + 0.62, -0.35, M.sheet); V(-7.9, y + 0.62, -2.0, -7.4, y + 0.75, -0.5, M.white);
  W.meshes.duvet = V(-7.35, y + 0.6, -2.18, -5.92, y + 0.7, -0.32, M.fabricBlue);
  V(-7.98, y, -2.2, -7.9, y + 1.1, -0.3, M.darkWood);
  B(-7.95, y, -0.28, -7.35, y + 0.55, 0.0 - 0.18, M.lightWood, {}); // nightstand (south of bed)
  B(-7.95, y, -2.9, -7.35, y + 0.55, -2.3, M.lightWood); // nightstand (north)
  inter('alarm', -7.65, y + 0.6, -2.6, 1.8);
  W.meshes.clock = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.1, 0.1), new THREE.MeshStandardMaterial({ color: 0x111111 })); W.meshes.clock.position.set(-7.6, y + 0.6, -2.6); scene.add(W.meshes.clock);
  const clockTex = TX.screen(128, 48); W.meshes.clockTex = clockTex;
  const cf = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.075), new THREE.MeshBasicMaterial({ map: clockTex })); cf.position.set(-7.485, y + 0.6, -2.6); cf.rotation.y = Math.PI / 2; scene.add(cf);
  B(-4.6, y, -5.95, -3.1, y + 2.1, -5.35, M.darkWood); inter('wardrobe', -3.85, y + 1.2, -5.2, 1.5); // wardrobe
  V(-4.0, y + 0.4, -5.34, -3.95, y + 1.6, -5.33, M.steel); V(-3.75, y + 0.4, -5.34, -3.7, y + 1.6, -5.33, M.steel);
  B(-7.95, y, -5.0, -7.45, y + 0.9, -3.5, M.lightWood); inter('dresser', -7.5, y + 0.95, -4.25, 1.5); // dresser
  W.meshes.wallet = V(-7.8, y + 0.9, -4.2, -7.6, y + 0.93, -4.05, M.black);
  const basket = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.22, 0.5, 12), M.lightWood); basket.position.set(-3.5, y + 0.25, -0.6); basket.castShadow = true; scene.add(basket);
  W.colliders.push({ x0: -3.75, x1: -3.25, y0: y, y1: y + 0.5, z0: -0.85, z1: -0.35 });
  V(-3.68, y + 0.45, -0.75, -3.32, y + 0.56, -0.45, M.fabricGrey); inter('shirt', -3.5, y + 0.5, -0.6, 1.5);
  W.meshes.bedRug = V(-6.5, y, -4.2, -4.3, y + 0.01, -2.4, M.fabricRed, { cast: false });
  fixture(-5.5, y + CEIL, -3, 'bed');
  // --- bathroom ---
  B(-0.65, y, -2.85, -0.12, y + 0.85, -2.2, M.white); // toilet-ish block
  B(-2.95, y, -1.5, -2.35, y + 0.85, -0.2, M.white); // sink cabinet (west wall)
  V(-2.9, y + 0.85, -1.3, -2.45, y + 0.9, -0.4, M.steel);
  B(-2.0, y, -0.85, -0.15, y + 0.6, -0.15, M.white); // tub along the front wall
  const mirror = new Reflector(new THREE.PlaneGeometry(0.9, 0.8), { textureWidth: 512, textureHeight: 512, color: 0xb8b8b8, clipBias: 0.003 });
  mirror.position.set(-2.92, y + 1.6, -0.85); mirror.rotation.y = Math.PI / 2; scene.add(mirror); W.meshes.mirror = mirror;
  mirror.camera.layers.enable(1);
  V(-2.95, y + 1.18, -1.32, -2.9, y + 2.02, -0.38, M.frame);
  inter('mirror', -2.6, y + 1.6, -0.85, 1.4); inter('sink', -2.6, y + 0.95, -0.85, 1.2);
  W.meshes.sinkBlood = V(-2.85, y + 0.905, -1.2, -2.5, y + 0.91, -0.5, M.blood, { cast: false }); W.meshes.sinkBlood.visible = false;
  W.meshes.mirrorWrite = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.2), new THREE.MeshBasicMaterial({ map: TX.scrawl('SAY HIS NAME', '#7a0806'), transparent: true }));
  W.meshes.mirrorWrite.position.set(-2.905, y + 1.75, -0.85); W.meshes.mirrorWrite.rotation.y = Math.PI / 2; W.meshes.mirrorWrite.visible = false; scene.add(W.meshes.mirrorWrite);
  fixture(-1.5, y + CEIL, -1.5, 'bath', { power: 8 });
  // --- entry ---
  B(-0.5, y, -5.9, -0.12, y + 0.9, -5.1, M.lightWood); inter('keys', -0.3, y + 0.95, -5.5, 1.4); // the key bowl
  W.meshes.keys = V(-0.38, y + 0.9, -5.6, -0.22, y + 0.94, -5.4, M.steel);
  V(-2.9, y + 1.5, -4.3, -2.85, y + 1.55, -3.4, M.darkWood); // coat hooks
  W.meshes.coat = V(-2.85, y + 0.7, -4.2, -2.6, y + 1.5, -3.6, M.fabricGrey);
  fixture(-1.5, y + CEIL, -4.5, 'entry', { power: 8 });
  // --- living room + kitchen ---
  B(0.2, y, -5.95, 4.0, y + 0.9, -5.35, M.lightWood); // counter along the back
  V(0.2, y + 0.9, -5.95, 4.0, y + 0.95, -5.35, M.darkSteel);
  B(4.2, y, -5.95, 5.0, y + 1.9, -5.25, M.white); // fridge
  V(4.95, y + 0.5, -5.24, 4.98, y + 1.6, -5.22, M.steel);
  V(1.0, y + 0.95, -5.9, 1.6, y + 0.98, -5.4, M.black); // the stove top
  for (const [bx, bz] of [[1.15, -5.75], [1.45, -5.75], [1.15, -5.5], [1.45, -5.5]]) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.012, 6, 16), M.darkSteel); r.rotation.x = Math.PI / 2; r.position.set(bx, y + 0.99, bz); scene.add(r); }
  const kettle = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.18, 12), M.steel); kettle.position.set(1.15, y + 1.07, -5.5); kettle.castShadow = true; scene.add(kettle); W.meshes.kettle = kettle;
  inter('stove', 1.3, y + 1.0, -5.6, 1.5);
  V(2.4, y + 0.88, -5.85, 3.1, y + 0.951, -5.45, M.steel); inter('sinkK', 2.75, y + 0.9, -5.4, 1.3); inter('valve', 2.75, y + 0.35, -5.3, 1.3); // sink + the gas valve under it
  W.meshes.valve = V(2.65, y + 0.3, -5.36, 2.85, y + 0.36, -5.32, M.yellow);
  // the phone and answering machine
  V(3.4, y + 0.95, -5.8, 3.75, y + 1.02, -5.5, M.black); W.meshes.msgLight = V(3.68, y + 1.02, -5.56, 3.72, y + 1.04, -5.52, M.redLight.clone()); inter('phone', 3.55, y + 1.0, -5.6, 1.4);
  // the radio
  V(0.4, y + 0.95, -5.8, 0.8, y + 1.15, -5.6, M.darkWood); inter('radio', 0.6, y + 1.05, -5.6, 1.4);
  // couch facing the TV on the east wall
  B(1.2, y, -3.3, 2.1, y + 0.45, -0.9, M.fabricGrey); V(1.2, y + 0.45, -3.3, 1.45, y + 0.95, -0.9, M.fabricGrey); V(1.2, y + 0.45, -3.3, 2.1, y + 0.7, -3.1, M.fabricGrey); V(1.2, y + 0.45, -1.1, 2.1, y + 0.7, -0.9, M.fabricGrey);
  B(2.9, y, -2.6, 3.9, y + 0.42, -1.6, M.lightWood); // coffee table
  B(5.4, y, -3.0, 5.95, y + 0.6, -1.0, M.darkWood); // TV stand
  V(5.6, y + 0.6, -2.7, 5.75, y + 1.35, -1.3, M.black);
  const tvTex = TX.screen(160, 96); W.meshes.tvTex = tvTex;
  const tvS = new THREE.Mesh(new THREE.PlaneGeometry(1.32, 0.66), new THREE.MeshBasicMaterial({ map: tvTex })); tvS.position.set(5.59, y + 0.98, -2.0); tvS.rotation.y = -Math.PI / 2; scene.add(tvS); W.meshes.tvScreen = tvS;
  inter('tv', 5.4, y + 1.0, -2.0, 2.4);
  // shelf with the photo
  B(0.15, y, -0.6, 0.5, y + 1.6, 0.0 - 0.17, M.darkWood);
  W.meshes.photo = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.2), new THREE.MeshStandardMaterial({ map: TX.photo(0), roughness: 0.5 }));
  W.meshes.photo.position.set(0.52, y + 1.25, -0.4); W.meshes.photo.rotation.y = Math.PI / 2; scene.add(W.meshes.photo); inter('photo', 0.6, y + 1.25, -0.4, 1.3);
  V(1.0, y, -4.6, 4.6, y + 0.01, -1.4, M.fabricRed, { cast: false });
  fixture(3, y + CEIL, -3, 'living'); fixture(2.0, y + CEIL, -5.0, 'kitchen', { power: 8 });

  // ===== the fourth floor hallway =====
  floor(-8, -8, 8, -6, y, M.hallFloor);
  V(-8, y + CEIL, -8, 8, y + CEIL + 0.2, -6, M.ceil, { cast: false });
  wallX(-8, -8, 8, y, M.hallWall, [{ a: -6, b: -5 }, { a: 1, b: 2 }, { a: 5.6, b: 7.0 }], 0.2);
  wallX(-6, 6, 8, y, M.hallWall, [], 0.2);
  wallZ(8, -8, -6, y, M.hallWall, [{ a: -7.6, b: -6.4 }], 0.2);
  wallZ(-8, -8, -6, y, M.hallWall, [], 0.2);
  door('4A', 'x', -8, -6, -5, y, M.aptDoor, { locked: true, name: '4A', lockedText: 'Mrs. Pell\'s door. Locked.', swing: 1 }); label('4A', -5.5, y + 1.75, -7.89, 0, 0.2, 0.12, { bg: '#c8a040', fg: '#2a1a08' });
  door('4C', 'x', -8, 1, 2, y, M.aptDoor, { locked: true, name: '4C', lockedText: 'Locked. Nobody has lived in 4C for years.', swing: 1 }); label('4C', 1.5, y + 1.75, -7.89, 0, 0.2, 0.12, { bg: '#c8a040', fg: '#2a1a08' });
  // the door that isn't always there: 4E, at the west end
  W.meshes.door4E = new THREE.Group(); scene.add(W.meshes.door4E);
  { const p = new THREE.Mesh(boxGeo(0.05, 2.08, 0.95, [1, 2]), M.aptDoor); p.position.set(-7.88, y + 1.04, -7.0); W.meshes.door4E.add(p);
    const l = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.12), new THREE.MeshStandardMaterial({ map: TX.sign('4E', { w: 128, h: 77, bg: '#c8a040', fg: '#2a1a08', font: 'bold 46px Georgia, serif' }) })); l.position.set(-7.85, y + 1.75, -7.0); l.rotation.y = Math.PI / 2; W.meshes.door4E.add(l); }
  W.meshes.door4E.visible = false; W.meshes.door4Ei = inter('door4E', -7.7, y + 1.1, -7.0, 1.6);
  W.meshes.hallWrite = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.6), new THREE.MeshBasicMaterial({ map: TX.scrawl('YOU\'RE LATE', '#5a0604'), transparent: true }));
  W.meshes.hallWrite.position.set(3.5, y + 1.6, -6.11); W.meshes.hallWrite.rotation.y = Math.PI; W.meshes.hallWrite.visible = false; scene.add(W.meshes.hallWrite);
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.16, 0.4, 10), M.fabricRed); pot.position.set(-3.6, y + 0.2, -7.7); scene.add(pot);
  const plant = new THREE.Mesh(new THREE.IcosahedronGeometry(0.35, 0), M.leaves); plant.position.set(-3.6, y + 0.75, -7.7); scene.add(plant); W.meshes.plant = plant;
  W.colliders.push({ x0: -3.85, x1: -3.35, y0: y, y1: y + 1, z0: -7.95, z1: -7.45 });
  fixture(-4, y + CEIL, -7, 'hall4'); fixture(3.5, y + CEIL, -7, 'hall4');

  // ===== the elevator =====
  // the shaft is behind the north wall at x 5.6..7.0. The car sits at the fourth floor, doors closed.
  W.meshes.elevL = V(5.62, y, -8.06, 6.3, y + 2.1, -8.02, M.elevDoor); W.meshes.elevR = V(6.3, y, -8.06, 6.98, y + 2.1, -8.02, M.elevDoor);
  W.colliders.push(W.meshes.elevCol = { x0: 5.6, x1: 7.0, y0: y, y1: y + 2.1, z0: -8.1, z1: -7.95 });
  V(7.15, y + 1.0, -7.92, 7.35, y + 1.3, -7.9, M.steel); inter('elevButton', 7.25, y + 1.15, -7.85, 1.4);
  W.meshes.elevBtn = V(7.22, y + 1.12, -7.9, 7.28, y + 1.18, -7.88, M.redLight.clone());
  label('ELEVATOR', 6.3, y + 2.35, -7.89, 0, 0.6, 0.12, { bg: '#2a2a2a', fg: '#e0e0e0' });
  // the car (only seen from inside)
  const ey = y;
  W.meshes.elevCar = new THREE.Group(); scene.add(W.meshes.elevCar);
  { const add = (x0, y0, z0, x1, y1, z1, m) => { const b = new THREE.Mesh(boxGeo(x1 - x0, y1 - y0, z1 - z0, m.userData.tile), m); b.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); b.receiveShadow = true; W.meshes.elevCar.add(b); return b; };
    add(5.5, ey - 0.1, -9.9, 7.1, ey, -8.1, M.hallFloor); add(5.5, ey + 2.4, -9.9, 7.1, ey + 2.5, -8.1, M.elevWall);
    add(5.4, ey, -9.9, 5.5, ey + 2.4, -8.1, M.elevWall); add(7.1, ey, -9.9, 7.2, ey + 2.4, -8.1, M.elevWall); add(5.5, ey, -10.0, 7.1, ey + 2.4, -9.9, M.elevWall);
    W.meshes.elevPanel = add(7.08, ey + 1.0, -8.6, 7.1, ey + 1.5, -8.3, M.whiteLight.clone()); }
  floor(5.5, -9.9, 7.1, -8.05, y, M.hallFloor, 0.05);
  W.meshes.elevBack = { x0: 5.5, x1: 7.1, y0: y, y1: y + 2.4, z0: -10.2, z1: -9.9 }; W.colliders.push(W.meshes.elevBack);
  W.colliders.push({ x0: 5.3, x1: 5.5, y0: y, y1: y + 2.4, z0: -10, z1: -8.1 }, { x0: 7.1, x1: 7.3, y0: y, y1: y + 2.4, z0: -10, z1: -8.1 });
  fixture(6.3, y + 2.4, -9, 'elevator', { power: 6, color: 0xfff0d0 });

  // ===== the stairwell (x 8..13, z -9..-5), five floors =====
  for (let n = 0; n <= 4; n++) {
    const fy = n * 3;
    floor(8, -9, 9.5, -5, fy, M.concrete, 0.25);
    if (n < 4) V(8, fy + 2.75, -9, 9.5, fy + 3 - 0.25, -5, M.concrete, { cast: false });
    if (n > 0) {
      floor(11.5, -9, 13, -5, fy - 1.5, M.concrete, 0.25);
      ramp(9.5, -9, 11.5, -7, 'x', 9.5, fy, 11.5, fy - 1.5);
      ramp(9.5, -7, 11.5, -5, 'x', 11.5, fy - 1.5, 9.5, fy - 3);
      // visible steps
      for (let s = 0; s < 8; s++) {
        const xa = 9.5 + s * 0.25, ya = fy - (s + 1) * 0.1875;
        V(xa, ya - 0.06, -9, xa + 0.25, ya + 0.0, -7.05, M.concrete, { cast: false });
        const xb = 11.5 - (s + 1) * 0.25, yb = fy - 1.5 - (s + 1) * 0.1875;
        V(xb, yb - 0.06, -6.95, xb + 0.25, yb, -5, M.concrete, { cast: false });
      }
      // the slab under each flight
      const under = (x0, z0, x1, z1, ya, yb) => { const g = new THREE.Mesh(new THREE.BoxGeometry(Math.hypot(x1 - x0, ya - yb), 0.15, z1 - z0), M.concrete); g.position.set((x0 + x1) / 2, (ya + yb) / 2 - 0.2, (z0 + z1) / 2); g.rotation.z = Math.atan2(ya - yb, x0 - x1) * -1; g.castShadow = true; scene.add(g); };
      under(9.5, -9, 11.5, -7.05, fy, fy - 1.5); under(11.5, -6.95, 9.5, -5, fy - 1.5, fy - 3);
      // railings
      V(9.5, fy - 3, -7.04, 11.5, fy - 0.5, -6.96, M.rail, { cast: false });
      fixture(12.2, fy - 1.5 + 2.6, -7, 'stairs', { power: 7, color: 0xe8f0ff, range: 7 });
      W.signs.push(label(String(n), 8.08, fy + 1.9, -8.2, Math.PI / 2, 0.3, 0.3, { bg: '#1a3a1a', fg: '#e8e8d0', font: 'bold 110px Arial' }));
    } else W.signs.push(label('L', 8.08, fy + 1.9, -8.2, Math.PI / 2, 0.3, 0.3, { bg: '#1a3a1a', fg: '#e8e8d0', font: 'bold 110px Arial' }));
    fixture(8.75, fy + 2.75, -7, 'stairs', { power: 7, color: 0xe8f0ff, range: 7 });
    // the landing door to each floor
    if (n === 4) door('stair4', 'z', 8, -7.6, -6.4, fy, M.metalDoor, { swing: -1, name: 'Stairs', sound: 'metal' });
    else if (n === 0) door('stair0', 'z', 8, -7.6, -6.4, fy, M.metalDoor, { swing: -1, name: 'Lobby', sound: 'metal' });
    else { door('stair' + n, 'z', 8, -7.6, -6.4, fy, M.metalDoor, { locked: true, swing: -1, name: 'Floor ' + n, lockedText: 'Floor ' + n + '. It won\'t open.', sound: 'metal' }); V(7.6, fy, -7.6, 7.9, fy + 2.1, -6.4, M.black); }
  }
  V(8, 14.8, -9, 13, 15, -5, M.concrete, { cast: false });
  for (let n = 0; n < 5; n++) {
    const fy = n * 3;
    wallZ(8, -9, -5, fy, M.stairWall, [{ a: -7.6, b: -6.4 }], 0.2, 3);
  }
  wallZ(13, -9, -5, 0, M.stairWall, [], 0.2, 15); wallX(-9, 8, 13, 0, M.stairWall, [], 0.2, 15); wallX(-5, 8, 13, 0, M.stairWall, [], 0.2, 15);
  B(9.5, 12, -9, 11.5, 14.8, -8.9, M.stairWall); // nothing above the top floor
  W.colliders.push({ x0: 9.6, x1: 13, y0: 12.2, y1: 15, z0: -9, z1: -7.05 }); // no going up from floor 4 (there is no up)
  V(9.5, 12.0, -9, 13, 12.2, -7.05, M.concrete);

  // ===== the lobby (x -4..8, z -8..0) and the laundry room (x -8..-4) =====
  floor(-4, -8, 8, 0, 0, M.lobbyFloor); floor(-8, -8, -4, 0, 0, M.concrete);
  V(-8, CEIL, -8, 8, CEIL + 0.2, 0, M.ceil, { cast: false });
  frontWall(0, 0, [[-8, -4, M.concrete], [-4, 8, M.lobbyWall]], [{ a: -0.7, b: 0.7, top: 2.3 }, { a: -3.6, b: -1.4, bottom: 0.9, top: 2.3, win: true }, { a: 1.6, b: 3.8, bottom: 0.9, top: 2.3, win: true }], 0.3);
  wallX(-8, -8, 8, 0, M.lobbyWall, [{ a: 5.6, b: 7.0 }], 0.2);
  wallZ(-4, -8, 0, 0, M.lobbyWall, [{ a: -6.5, b: -5.5 }]);
  wallZ(-8, -8, 0, 0, M.brick2, [{ a: -2.2, b: -1.2 }], 0.25);
  door('front0', 'x', 0, -0.7, 0.7, 0, M.metalDoor, { swing: 1, name: 'Front door', sound: 'metal' });
  W.doors.get('front0').panel.material = M.glass.clone(); W.doors.get('front0').panel.material.opacity = 0.35;
  door('laundry', 'z', -4, -6.5, -5.5, 0, M.door, { swing: -1, name: 'Laundry room' });
  door('back', 'z', -8, -2.2, -1.2, 0, M.metalDoor, { swing: -1, name: 'Back door', sound: 'metal' });
  label('EXIT', -7.85, 2.3, -1.7, Math.PI / 2, 0.4, 0.14, { bg: '#2a0a0a', fg: '#ff4030', glow: 0.8 });
  // the elevator in the lobby: doors only
  W.meshes.elev0L = V(5.62, 0, -8.06, 6.3, 2.1, -8.02, M.elevDoor); W.meshes.elev0R = V(6.3, 0, -8.06, 6.98, 2.1, -8.02, M.elevDoor);
  W.colliders.push({ x0: 5.6, x1: 7.0, y0: 0, y1: 2.1, z0: -8.1, z1: -7.95 });
  V(-3.9, 0.8, -7.0, -3.85, 2.0, -3.0, M.steel); // mailboxes on the west wall
  for (let i = 0; i < 8; i++) for (let j = 0; j < 4; j++) V(-3.86, 0.85 + j * 0.3, -6.9 + i * 0.48, -3.82, 1.1 + j * 0.3, -6.5 + i * 0.48, M.darkSteel, { cast: false });
  inter('mail', -3.7, 1.4, -5, 1.4);
  B(2.5, 0, -1.2, 4.5, 0.45, -0.7, M.darkWood); // bench
  V(4.0, 1.2, -7.92, 5.2, 2.0, -7.9, M.white); inter('notice', 4.6, 1.6, -7.8, 1.4);
  fixture(0, CEIL, -4, 'lobby'); fixture(5, CEIL, -4, 'lobby');
  // laundry
  for (let i = 0; i < 3; i++) B(-7.9, 0, -7.6 + i * 0.75, -7.2, 0.9, -6.95 + i * 0.75, M.white);
  fixture(-6, CEIL, -4, 'laundry', { power: 6, color: 0xe8f0ff });
  // the walls above the lobby that the stairwell windows might show
  V(-8, 3, -6, 8, 12 - 0.2, -5.9, M.concrete, { cast: false });

  // ===== the alley (x -11..-8, z -10..0) =====
  floor(-11, -10, -8, 0, 0, M.concrete);
  wallZ(-11, -10, 0, 0, M.brick2, [], 0.3, 12); wallX(-10, -11, -8, 0, M.brick2, [], 0.3, 12);
  B(-10.9, 0, -6, -9.6, 1.3, -4.4, M.darkSteel); // dumpster
  for (let i = 0; i < 4; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 6), M.black); b.position.set(-10.5 + (i % 2) * 0.5, 0.25, -3.6 + i * 0.4); b.scale.y = 0.8; scene.add(b); }

  // ===== the building from outside =====
  // our building: front at z = 0, x -8..13 (the stairwell part too), six floors of brick
  const front = 0.15;
  B(-8, CEIL, -0.15, 8, 3.0, front, M.brick); // between the lobby and the 1st floor
  for (let n = 1; n <= 5; n++) {
    const fy = n * 3;
    if (n === 4) { V(-8, fy - 0.2, -0.15, 6, fy, front, M.brick); continue; }
    V(-8, fy, -0.15, 8, fy + 3, front, M.brick, { cast: true });
    for (const wx of [-7, -4, -1.5, 1.3, 3.9]) { V(wx, fy + 0.8, front, wx + 1.7, fy + 2.3, front + 0.02, M.carGlass, { cast: false }); V(wx - 0.06, fy + 0.74, front, wx + 1.76, fy + 0.8, front + 0.12, M.frame, { cast: false }); }
  }
  V(-8, 12 + CEIL, -0.15, 6, 15, front, M.brick); V(6, 12, -0.15, 8, 15, front, M.brick);
  V(-8.3, 18, -10.5, 13.3, 18.4, 0.4, M.concrete); // roof edge
  V(8, 0, -5, 13, 18, front, M.brick); V(-8, 15, -10, 8, 18, front, M.brick);
  V(-8, 0, -10.2, 13, 18, -9.9, M.brick2, { cast: false }); V(8, 15, -9.2, 13, 18, -4.9, M.brick, { cast: false });
  V(-8.35, 3, -10, -8.08, 18, 0.1, M.brick); // west side above the alley
  // the awning over the front door, and the air conditioner hanging above it
  V(-1.5, 2.6, front, 1.5, 2.7, 1.6, M.fabricRed, { cast: true });
  const ac = new THREE.Group(); scene.add(ac); W.meshes.ac = ac;
  { const b = new THREE.Mesh(boxGeo(0.8, 0.5, 0.6, [1, 1]), M.white); b.castShadow = true; ac.add(b); const gr = new THREE.Mesh(boxGeo(0.6, 0.3, 0.02, [1, 1]), M.darkSteel); gr.position.set(0, 0, 0.31); ac.add(gr); }
  ac.position.set(0.2, 7.0, 0.5); W.meshes.acHome = ac.position.clone();
  V(-0.3, 6.6, front, -0.25, 6.75, 0.8, M.rail); V(0.65, 6.6, front, 0.7, 6.75, 0.8, M.rail); // its brackets
  // the steps
  B(-1.5, 0, front, 1.5, 0.15, 1.2, M.concrete, { floor: true });
  // the neighbours: west of the alley, east of the stairwell
  V(-40, 0, -14, -11, 16, front, M.brick2); V(13, 0, -12, 40, 14, front, M.brick);
  for (const [x0, x1, h, m] of [[-40, -11, 16, 'f1'], [13, 40, 14, 'f2']]) {
    const tex = TX.facade(m, m === 'f1' ? 0x6a5a50 : 0x8a4030, m === 'f1' ? 31 : 32, 0.1); tex.repeat.set((x1 - x0) / 6, h / 6);
    const p = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, h - 3), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 })); p.position.set((x0 + x1) / 2, 3 + (h - 3) / 2, front + 0.02); scene.add(p);
  }
  W.colliders.push({ x0: -40, x1: -11, y0: 0, y1: 16, z0: -14, z1: front }, { x0: 13, x1: 40, y0: 0, y1: 14, z0: -12, z1: front }, { x0: 8, x1: 13, y0: 0, y1: 18, z0: -5, z1: front });

  // ===== Callow Street =====
  floor(-40, front, 40, 4, 0.15, M.paving, 0.3); // near sidewalk
  V(-40, 0, 3.95, 40, 0.15, 4.0, M.concrete, { cast: false }); // curb
  floor(-40, 4, 40, 12, 0.0, M.asphalt, 0.3);
  floor(-40, 12, 40, 16, 0.15, M.paving, 0.3);
  floor(-11, 0, -8, front, 0.0, M.concrete, 0.1);
  // lane markings, the crossing
  for (let x = -40; x < 40; x += 4) V(x, 0.001, 7.95, x + 2, 0.012, 8.05, M.yellow, { cast: false });
  for (let i = 0; i < 6; i++) V(1.6, 0.001, 4.4 + i * 1.3, 4.4, 0.012, 4.95 + i * 1.3, M.stripe, { cast: false });
  // walk signals
  const signal = (x, z, ry) => {
    V(x - 0.06, 0.15, z - 0.06, x + 0.06, 3.0, z + 0.06, M.darkSteel);
    const s = TX.screen(64, 64); const m = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.4), new THREE.MeshBasicMaterial({ map: s })); m.position.set(x, 2.6, z); m.rotation.y = ry; scene.add(m);
    W.colliders.push({ x0: x - 0.1, x1: x + 0.1, y0: 0, y1: 3, z0: z - 0.1, z1: z + 0.1 });
    return s;
  };
  W.meshes.walkNear = signal(1.3, 3.7, Math.PI); W.meshes.walkFar = signal(4.7, 12.3, 0);
  // the far side: buildings, the shop, the bus stop
  V(-40, 0, 16, 2, 14, 30, M.brick2); V(10, 0, 16, 40, 12, 30, M.brick); V(2, 3, 16, 10, 12, 30, M.brick);
  for (const [x0, x1, h, m, s] of [[-40, 2, 14, 'f3', 33], [10, 40, 12, 'f4', 34], [2, 10, 12, 'f5', 35]]) {
    const tex = TX.facade(m, s === 34 ? 0x8a4030 : 0x7a6a5a, s, 0.12); tex.repeat.set((x1 - x0) / 6, (h - 3) / 6);
    const p = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, h - 3), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 })); p.position.set((x0 + x1) / 2, 3 + (h - 3) / 2, 15.98); p.rotation.y = Math.PI; scene.add(p);
  }
  W.colliders.push({ x0: -40, x1: 2, y0: 0, y1: 14, z0: 16, z1: 30 }, { x0: 10, x1: 40, y0: 0, y1: 12, z0: 16, z1: 30 });
  // the window across the street where someone stands (fourth floor, facing Owen's living room)
  V(1.2, 12.4, 15.9, 3.0, 14.2, 16.2, M.black, { cast: false });
  W.meshes.oppWindow = V(1.25, 12.45, 16.15, 2.95, 14.15, 16.2, M.lamp.clone(), { cast: false }); W.meshes.oppWindow.material.emissive.set(0xc8a870); W.meshes.oppWindow.material.emissiveIntensity = 0.5;
  // the shop: Callow Mart (x 2..10, z 16..22)
  floor(2, 16, 10, 22, 0.15, M.shopFloor);
  V(2, 3.0, 16, 10, 3.2, 22, M.ceil, { cast: false });
  wallX(16, 2, 10, 0.15, M.shopWall, [{ a: 2.4, b: 4.8, bottom: 0.6, top: 2.4, win: true }, { a: 5, b: 6.2, top: 2.3 }, { a: 6.6, b: 9.6, bottom: 0.6, top: 2.4, win: true }], 0.2, 2.85);
  wallZ(2, 16, 22, 0.15, M.shopWall, [], 0.2, 2.85); wallZ(10, 16, 22, 0.15, M.shopWall, [], 0.2, 2.85); wallX(22, 2, 10, 0.15, M.shopWall, [], 0.2, 2.85);
  door('shop', 'x', 16, 5, 6.2, 0.15, M.metalDoor, { swing: 1, name: 'Callow Mart', sound: 'metal' });
  W.doors.get('shop').panel.material = M.glass.clone(); W.doors.get('shop').panel.material.opacity = 0.35;
  label('CALLOW MART', 6, 2.75, 15.88, Math.PI, 3.6, 0.5, { bg: '#b02020', fg: '#ffffff', glow: 0.6, font: 'bold 52px Arial' });
  for (const sx of [3.2, 5.6]) { B(sx, 0.15, 17.5, sx + 0.7, 1.7, 19.5, M.lightWood); for (let k = 0; k < 4; k++) V(sx - 0.02, 0.4 + k * 0.38, 17.6, sx + 0.72, 0.58 + k * 0.38, 19.4, [M.fabricRed, M.yellow, M.fabricBlue, M.white][k], { cast: false }); }
  B(7.4, 0.15, 19.8, 9.9, 1.05, 20.6, M.darkWood); V(7.4, 1.05, 19.8, 9.9, 1.1, 20.6, M.steel); // the counter (along the east, clerk behind it)
  V(8.6, 1.1, 20.0, 8.95, 1.35, 20.3, M.black); inter('counter', 8.6, 1.2, 19.6, 1.8);
  B(9.0, 0.15, 21.5, 9.95, 2.0, 21.95, M.darkWood); // shelf behind the clerk
  const rack = V(6.6, 0.15, 16.3, 7.4, 1.0, 16.7, M.darkSteel); void rack;
  const ppr = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.56), new THREE.MeshStandardMaterial({ map: TX.newspaper(), roughness: 0.8 }));
  ppr.position.set(7.0, 1.02, 16.55); ppr.rotation.x = -Math.PI / 2 + 0.5; ppr.rotation.z = Math.PI; scene.add(ppr); inter('paper', 7.0, 1.0, 16.6, 1.5);
  B(2.2, 0.15, 21.0, 3.2, 1.9, 21.9, M.white); // fridge
  fixture(4.5, 3.0, 18.5, 'shop', { color: 0xf0f8ff }); fixture(8, 3.0, 20, 'shop', { color: 0xf0f8ff });
  // the bus stop: shelter, bench, the sign
  V(-7, 0.15, 15.45, -3, 2.4, 15.55, M.glass, { cast: false }); V(-7.05, 0.15, 14.4, -6.95, 2.4, 15.55, M.glass, { cast: false }); V(-3.05, 0.15, 14.4, -2.95, 2.4, 15.55, M.glass, { cast: false });
  V(-7.1, 2.4, 14.2, -2.9, 2.5, 15.6, M.darkSteel); for (const px of [-7, -3]) V(px - 0.05, 0.15, 14.25, px + 0.05, 2.4, 14.35, M.darkSteel);
  B(-6.4, 0.15, 15.0, -3.6, 0.6, 15.4, M.darkWood);
  W.colliders.push({ x0: -7.1, x1: -2.9, y0: 0, y1: 2.4, z0: 15.4, z1: 15.6 }, { x0: -7.1, x1: -6.9, y0: 0, y1: 2.4, z0: 14.4, z1: 15.6 }, { x0: -3.1, x1: -2.9, y0: 0, y1: 2.4, z0: 14.4, z1: 15.6 });
  V(-1.55, 0.15, 12.45, -1.45, 2.8, 12.55, M.darkSteel);
  W.meshes.busSign = label('BUS 40\nCALLOW ST', -1.5, 2.5, 12.6, 0, 0.5, 0.5, { bg: '#1a3a6a', fg: '#ffffff', font: 'bold 44px Arial' });
  W.meshes.busSignBack = label('BUS 40\nCALLOW ST', -1.5, 2.5, 12.4, Math.PI, 0.5, 0.5, { bg: '#1a3a6a', fg: '#ffffff', font: 'bold 44px Arial' });
  W.colliders.push({ x0: -1.6, x1: -1.4, y0: 0, y1: 2.8, z0: 12.4, z1: 12.6 });
  // street furniture
  for (const x of [-20, -7, 6, 18]) tree(x, 2.6);
  for (const x of [-24, -12, 0, 12, 24]) { V(x - 0.07, 0.15, 13.0 - 0.07, x + 0.07, 5.5, 13.0 + 0.07, M.darkSteel); V(x - 0.07, 5.4, 12.4, x + 0.07, 5.5, 13.0, M.darkSteel); W.colliders.push({ x0: x - 0.12, x1: x + 0.12, y0: 0, y1: 5.5, z0: 12.88, z1: 13.12 }); }
  B(4.5, 0.15, 2.2, 4.9, 0.75, 2.6, M.carRed); // hydrant-ish post
  B(-3.3, 0.15, 3.0, -2.7, 1.0, 3.5, M.darkSteel); // trash can
  // Owen's car, parked by the alley, and the police car further along
  const car = makeCar(M.carBlue); car.position.set(-13.6, 0, 5.05); scene.add(car); W.meshes.car = car;
  W.colliders.push({ x0: -15.8, x1: -11.4, y0: 0, y1: 1.4, z0: 4.15, z1: 5.95 });
  // the damage: a smashed headlight, a dent, and what is caught in the grille
  W.meshes.dent = V(-11.43, 0.45, 4.6, -11.35, 0.8, 5.4, M.darkSteel); W.meshes.carBlood = V(-11.36, 0.35, 4.7, -11.33, 0.7, 5.3, M.blood, { cast: false });
  inter('car', -11.0, 0.8, 5.0, 1.8); inter('glovebox', -13.0, 1.0, 4.0, 1.6);
  const cop = makeCar(M.carWhite); cop.position.set(13.5, 0, 5.05); scene.add(cop); W.meshes.cop = cop;
  V(13.2, 1.42, 4.6, 13.8, 1.55, 5.5, M.redLight.clone()); V(-2.2 + 15.6, 0.55, 4.14, 15.6, 0.7, 4.16, M.busStripe);
  W.colliders.push({ x0: 11.3, x1: 15.7, y0: 0, y1: 1.4, z0: 4.15, z1: 5.95 });
  // the limits of the world: the street goes on, but you don't
  W.colliders.push({ x0: -30, x1: -29, y0: -5, y1: 20, z0: 0, z1: 16 }, { x0: 29, x1: 30, y0: -5, y1: 20, z0: 0, z1: 16 });
  // the sky
  const sky = new THREE.Mesh(new THREE.SphereGeometry(140, 24, 12), M.sky); scene.add(sky); W.meshes.sky = sky;
  W.mat = M;
  details(scene);
  mergeStatic(scene);
  return W;
}

// ---------- optimisation: bake every static box into a few big meshes ----------
// Everything that never moves or changes is merged by material, in 12 m cells (so the camera can still skip
// cells behind it). The ~600 boxes of the world become a few dozen draw calls.
function mergeStatic(scene) {
  const keep = new Set();
  const mark = (o) => { if (!o) return; if (o.isObject3D) o.traverse((c) => keep.add(c)); };
  for (const v of Object.values(W.meshes)) mark(v);
  W.glass.forEach(mark); W.fixtures.forEach((f) => mark(f.m)); W.signs.forEach(mark);
  const groups = new Map();
  for (const m of [...scene.children]) {
    if (!m.isMesh || !m.userData.static || keep.has(m) || !m.geometry.index) continue;
    const p = m.position, cell = `${Math.floor(p.x / 12)},${Math.floor(p.y / 6)},${Math.floor(p.z / 12)}`;
    const key = m.material.uuid + '|' + m.castShadow + '|' + cell;
    if (!groups.has(key)) groups.set(key, { mat: m.material, cast: m.castShadow, list: [] });
    groups.get(key).list.push(m);
  }
  let before = 0, after = 0;
  for (const gr of groups.values()) {
    before += gr.list.length;
    if (gr.list.length < 2) { after++; continue; }
    const geos = gr.list.map((m) => { m.updateMatrixWorld(true); const g = m.geometry.clone(); g.applyMatrix4(m.matrixWorld); return g; });
    const merged = mergeGeometries(geos, false);
    geos.forEach((g) => g.dispose());
    if (!merged) { after += gr.list.length; continue; }
    merged.computeBoundingSphere();
    const mesh = new THREE.Mesh(merged, gr.mat); mesh.castShadow = gr.cast; mesh.receiveShadow = true; mesh.matrixAutoUpdate = false;
    scene.add(mesh); after++;
    for (const m of gr.list) { scene.remove(m); m.geometry.dispose(); for (const c of W.colliders) if (c.mesh === m) c.mesh = null; }
  }
  // nothing left at the top level moves unless the game moves it: stop recomputing their matrices every frame
  for (const m of scene.children) if (m.isMesh && m.userData.static && !keep.has(m)) { m.updateMatrix(); m.matrixAutoUpdate = false; }
  W.stats = { before, after };
}


// ---------- queries ----------
export function groundY(x, z, feet) {
  let best = -Infinity;
  for (const f of W.floors) {
    if (x < f.x0 || x > f.x1 || z < f.z0 || z > f.z1) continue;
    let y = f.y;
    if (f.ramp) { const r = f.ramp, a = r.axis === 'x' ? x : z, k = Math.max(0, Math.min(1, (a - r.a0) / (r.a1 - r.a0))); y = r.y0 + (r.y1 - r.y0) * k; }
    if (y <= feet + 0.45 && y > best) best = y;
  }
  return best;
}
export function collide(x, z, dx, dz, r, feet, h = 1.7) {
  const lo = feet + 0.3, hi = feet + h;
  const test = (px, pz) => {
    for (const c of W.colliders) {
      if (c.off || c.y1 <= lo || c.y0 >= hi) continue;
      if (px > c.x0 - r && px < c.x1 + r && pz > c.z0 - r && pz < c.z1 + r) return c;
    }
    return null;
  };
  let nx = x + dx, c;
  if ((c = test(nx, z))) nx = dx > 0 ? c.x0 - r - 0.001 : dx < 0 ? c.x1 + r + 0.001 : nx;
  if (test(nx, z)) nx = x;
  let nz = z + dz;
  if ((c = test(nx, nz))) nz = dz > 0 ? c.z0 - r - 0.001 : dz < 0 ? c.z1 + r + 0.001 : nz;
  if (test(nx, nz)) nz = z;
  return [nx, nz];
}
// is there a wall between two points (on roughly the same level)? Used so you can't use things through walls.
export function clearLine(x0, z0, x1, z1, y) {
  const n = Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 0.2);
  for (let i = 1; i < n; i++) {
    const x = x0 + (x1 - x0) * i / n, z = z0 + (z1 - z0) * i / n;
    for (const c of W.colliders) { if (c.off || c.y0 > y || c.y1 < y) continue; if (x > c.x0 && x < c.x1 && z > c.z0 && z < c.z1) return false; }
  }
  return true;
}
// where you are: used for sounds, lights, the story
export function zoneOf(x, y, z) {
  if (x > 8 && x < 13 && z > -9 && z < -5) return 'stairs';
  if (y > 11) {
    if (x > 5.4 && x < 7.2 && z < -8.05) return 'elevator';
    if (z < -6) return 'hall4';
    if (x < -3) return 'bed';
    if (x < 0) return z > -3 ? 'bath' : 'entry';
    return 'living';
  }
  if (y > 2.5) return 'stairs';
  if (z < 0 && x > -4 && x < 8) return 'lobby';
  if (z < 0 && x > -8 && x < -4) return 'laundry';
  if (z < 0 && x > -11 && x < -8) return 'alley';
  if (z > 16 && x > 2 && x < 10) return 'shop';
  if (z >= 4 && z <= 12) return 'road';
  if (z > 12) return 'far';
  return 'street';
}
export const indoors = (zone) => !['street', 'road', 'far', 'alley'].includes(zone);
export function updateWorld(dt) {
  for (const d of W.doors.values()) {
    if (Math.abs(d.ang - d.target) < 0.001) continue;
    d.ang += (d.target - d.ang) * Math.min(1, dt * 7);
    d.pivot.rotation.y = d.axis === 'x' ? -d.ang : d.ang;
  }
}

// ---------- detail: the clutter of a life, and of a street. All static, so it merges into the big meshes. ----------
function details(scene) {
  const y = Y4, R = TX.rng(99);
  const col = (c, rough = 0.7, metal = 0) => { const k = 'c' + c.toString(16) + rough; return M[k] || mat(k, null, [1, 1], { color: c, rough, metal }); };
  const bookCols = [0x7a2a2a, 0x2a4a6a, 0x3a5a3a, 0xc8a050, 0x5a3a5a, 0xd8d0c0, 0x1a1a1a].map((c) => col(c, 0.8));
  const books = (x0, x1, yb, z0, z1, alongX = true) => {
    let p = alongX ? x0 : z0; const end = alongX ? x1 : z1;
    while (p < end - 0.05) { const w = 0.025 + R() * 0.035, h = 0.18 + R() * 0.1, m = bookCols[(R() * bookCols.length) | 0];
      if (alongX) V(p, yb, z0, p + w, yb + h, z0 + (z1 - z0) * (0.8 + R() * 0.2), m, { cast: false }); else V(x0, yb, p, x0 + (x1 - x0) * (0.8 + R() * 0.2), yb + h, p + w, m, { cast: false });
      p += w + 0.004; if (R() < 0.06) p += 0.08; }
  };
  const bottle = (x, yb, z, c = 0x2a5a2a) => { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.24, 8), col(c, 0.15, 0.2)); b.position.set(x, yb + 0.12, z); b.userData.static = true; scene.add(b); const n = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.02, 0.08, 6), col(c, 0.15, 0.2)); n.position.set(x, yb + 0.28, z); n.userData.static = true; scene.add(n); };
  const curtains = (x0, x1, yt, z, m) => { V(x0 - 0.25, yt - 1.7, z - 0.25, x0 + 0.05, yt, z - 0.17, m, { cast: false }); V(x1 - 0.05, yt - 1.7, z - 0.25, x1 + 0.25, yt, z - 0.17, m, { cast: false }); V(x0 - 0.3, yt, z - 0.23, x1 + 0.3, yt + 0.03, z - 0.2, M.steel, { cast: false }); };
  const lamp = (x, yb, z, shade = 0xe8d8b0) => { V(x - 0.07, yb, z - 0.07, x + 0.07, yb + 0.03, z + 0.07, M.darkSteel); V(x - 0.01, yb, z - 0.01, x + 0.01, yb + 0.32, z + 0.01, M.darkSteel); const s = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.14, 0.16, 12, 1, true), col(shade, 0.9)); s.material.side = THREE.DoubleSide; s.position.set(x, yb + 0.38, z); s.userData.static = true; scene.add(s); };
  const frame = (x, yc, z, w, h, ry, c = 0x6a5a4a) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.03), col(c, 0.6)); m.position.set(x, yc, z); m.rotation.y = ry; m.userData.static = true; scene.add(m); const p = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.06, h - 0.06), col([0x8a9ab0, 0xb09070, 0x6a8a6a][(R() * 3) | 0], 0.9)); p.position.copy(m.position).add(new THREE.Vector3(Math.sin(ry) * 0.017, 0, Math.cos(ry) * 0.017)); p.rotation.y = ry; p.userData.static = true; scene.add(p); };
  const radiator = (x0, x1, yb, z0, z1) => { const n = Math.floor(Math.max(x1 - x0, z1 - z0) / 0.06); for (let i = 0; i < n; i++) { if (x1 - x0 > z1 - z0) V(x0 + i * 0.06, yb + 0.12, z0, x0 + i * 0.06 + 0.04, yb + 0.7, z1, M.white, { cast: false }); else V(x0, yb + 0.12, z0 + i * 0.06, x1, yb + 0.7, z0 + i * 0.06 + 0.04, M.white, { cast: false }); } };

  // --- bedroom ---
  curtains(-7, -4.5, y + 2.45, 0, M.fabricBlue);
  lamp(-7.65, y + 0.55, -0.0 - 0.45); lamp(-7.65, y + 0.55, -2.75);
  frame(-5.2, y + 1.7, -5.92, 0.8, 0.6, 0); frame(-7.92, y + 1.6, -1.2, 0.5, 0.7, Math.PI / 2);
  B(-4.4, y, -0.5, -3.95, y + 1.8, -0.18, M.darkWood); for (let s = 0; s < 4; s++) { V(-4.4, y + 0.1 + s * 0.44, -0.5, -3.95, y + 0.13 + s * 0.44, -0.18, M.lightWood, { cast: false }); books(-4.38, -3.97, y + 0.13 + s * 0.44, -0.48, -0.2); }
  V(-6.6, y, -3.1, -6.0, y + 0.04, -2.6, M.fabricGrey, { cast: false }); V(-5.3, y, -2.2, -4.9, y + 0.06, -1.9, col(0x2a3040), { cast: false }); // clothes on the floor
  bottle(-7.55, y + 0.55, -0.25, 0x5a3a1a); bottle(-7.7, y + 0.9, -3.7, 0x2a5a2a);
  // --- bathroom ---
  V(-0.6, y + 0.85, -2.85, -0.15, y + 1.25, -2.65, M.white); // cistern
  V(-2.0, y + 2.0, -0.95, -0.15, y + 2.03, -0.92, M.steel, { cast: false }); V(-1.95, y + 0.65, -0.96, -1.7, y + 2.0, -0.93, col(0xc8d8e0, 0.9), { cast: false }); // shower curtain
  V(-0.12, y + 1.2, -2.2, -0.08, y + 1.23, -1.4, M.steel, { cast: false }); V(-0.14, y + 0.7, -2.1, -0.1, y + 1.22, -1.5, col(0x8a3a3a, 0.95), { cast: false }); // towel
  V(-2.95, y + 1.0, -1.45, -2.9, y + 1.05, -1.35, col(0xe8e0c0), { cast: false });
  // --- entry ---
  V(-2.6, y, -5.9, -1.4, y + 0.02, -5.3, col(0x5a3a2a, 0.95), { cast: false }); // mat
  V(-0.45, y + 0.9, -5.85, -0.15, y + 1.15, -5.15, col(0x2a2a2a), { cast: false }); // a stack of mail
  frame(-2.92, y + 1.6, -5.2, 0.4, 0.5, Math.PI / 2);
  // --- living room and kitchen ---
  curtains(0.8, 2.6, y + 2.45, 0, M.fabricRed); curtains(3.4, 5.2, y + 2.45, 0, M.fabricRed);
  V(0.2, y + 1.55, -5.95, 4.0, y + 2.3, -5.6, M.lightWood); for (let i = 0; i < 5; i++) V(0.95 + i * 0.75, y + 1.6, -5.59, 0.97 + i * 0.75, y + 2.25, -5.58, M.darkWood, { cast: false }); // upper cabinets
  V(3.2, y + 0.95, -5.9, 3.35, y + 1.25, -5.5, M.darkSteel); // kettle base / toaster
  V(2.2, y + 0.95, -5.9, 2.35, y + 1.25, -5.6, col(0xe8e8e0, 0.4)); // paper towels
  V(4.25, y + 1.9, -5.9, 4.95, y + 2.3, -5.35, col(0xdadada, 0.4)); // microwave on the fridge
  for (let i = 0; i < 3; i++) bottle(3.1 + i * 0.18, y + 0.42, -2.3 + i * 0.12, [0x2a5a2a, 0x6a4a1a, 0x2a5a2a][i]); // empty bottles on the coffee table
  V(3.3, y + 0.42, -1.95, 3.75, y + 0.47, -1.6, col(0xc8a060, 0.9), { cast: false }); // pizza box
  V(1.25, y + 0.45, -2.9, 1.6, y + 0.75, -2.5, M.fabricRed, { cast: false }); V(1.25, y + 0.45, -1.5, 1.6, y + 0.75, -1.1, M.fabricBlue, { cast: false }); // cushions
  B(5.5, y, -0.6, 5.95, y + 1.9, -0.18, M.darkWood); for (let s = 0; s < 4; s++) { V(5.5, y + 0.1 + s * 0.46, -0.6, 5.95, y + 0.13 + s * 0.46, -0.18, M.lightWood, { cast: false }); books(5.52, 5.93, y + 0.13 + s * 0.46, -0.58, -0.2, true); }
  lamp(0.33, y + 1.6, -0.4); frame(5.92, y + 1.75, -3.8, 0.9, 0.6, -Math.PI / 2);
  const plant = (x, yb, z, s = 1) => { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.15 * s, 0.12 * s, 0.3 * s, 10), M.fabricRed); p.position.set(x, yb + 0.15 * s, z); p.userData.static = true; scene.add(p); const l = new THREE.Mesh(new THREE.IcosahedronGeometry(0.32 * s, 0), M.leaves); l.position.set(x, yb + 0.55 * s, z); l.userData.static = true; scene.add(l); };
  plant(5.6, y, -5.7, 1.2); plant(-7.6, y, -5.6); plant(-3.6, 0, -7.6, 1.3); plant(7.5, 0, -0.6, 1.3);
  radiator(0.9, 2.5, y, -0.3, -0.18); radiator(-6.9, -4.6, y, -0.3, -0.18);
  // --- hallway ---
  for (const x of [-6.5, -1.8, 2.5, 5.5]) { V(x - 0.1, y + 1.8, -6.12, x + 0.1, y + 2.1, -6.08, col(0xe8d8a0, 0.5), { cast: false }); }
  V(7.6, y + 0.2, -6.2, 7.85, y + 0.75, -6.1, col(0xc01010, 0.4)); // fire extinguisher
  for (const x of [-5.5, 1.5]) V(x - 0.5, y, -7.85, x + 0.5, y + 0.02, -7.3, col(0x4a3a2a, 0.95), { cast: false });
  V(-2.05, y, -6.6, -0.95, y + 0.02, -6.12, col(0x6a2a2a, 0.95), { cast: false });
  radiator(-1.0, 0.2, y, -7.95, -7.85);
  // --- stairwell ---
  for (let n = 0; n <= 4; n++) { V(12.85, n * 3 + 1.0, -8.6, 12.95, n * 3 + 1.7, -7.9, col(0xb01818, 0.5), { cast: false }); }
  // --- lobby ---
  V(-2, 0, -6.5, 3, 0.015, -2.5, col(0x6a1a1a, 0.95), { cast: false });
  radiator(-3.0, -1.6, 0, -0.3, -0.18);
  // --- the street ---
  const parked = [[-24, 4.95, 0x3a3a3a], [-19, 5.05, 0xc8c8c0], [7, 5.0, 0x4a2a1a], [19, 5.0, 0x2a4a2a], [-17, 11.05, 0x6a6a20, true], [20, 11.0, 0x1a1a3a, true]];
  for (const [x, z, c, far] of parked) { const car = makeCar(col(c, 0.35, 0.5)); car.position.set(x, 0, z); if (far) car.rotation.y = Math.PI; scene.add(car); W.colliders.push({ x0: x - 2.2, x1: x + 2.2, y0: 0, y1: 1.4, z0: z - 0.9, z1: z + 0.9 }); }
  // fire escapes on our building and the neighbours
  for (const [x0, x1] of [[3.6, 6.2], [-29, -25], [20, 24]]) for (let n = 1; n <= 4; n++) {
    const fy = n * 3;
    V(x0, fy - 0.05, 0.15, x1, fy, 1.1, M.rail); V(x0, fy + 0.9, 1.05, x1, fy + 0.95, 1.1, M.rail, { cast: false });
    for (let k = 0; k <= 4; k++) V(x0 + (x1 - x0) * k / 4 - 0.02, fy, 1.06, x0 + (x1 - x0) * k / 4 + 0.02, fy + 0.95, 1.1, M.rail, { cast: false });
  }
  // shop fronts across the way: awnings
  for (const [x0, x1, c] of [[-20, -14, 0x2a6a3a], [-11, -6.5, 0x6a2a2a], [12, 17, 0x2a3a6a], [22, 27, 0x8a6a2a]]) { const a = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, 0.06, 1.4), col(c, 0.9)); a.position.set((x0 + x1) / 2, 3.0, 15.4); a.rotation.x = -0.3; a.userData.static = true; scene.add(a); V(x0 + 0.3, 0.15, 15.95, x1 - 0.3, 2.6, 15.99, M.carGlass, { cast: false }); }
  V(2.1, 2.95, 15.1, 9.9, 3.05, 16, col(0xb02020, 0.9)); // the mart's awning
  // pavement things
  V(-15.6, 0.15, 2.9, -15.0, 0.95, 3.3, col(0x2a5a9a, 0.6)); W.colliders.push({ x0: -15.6, x1: -15, y0: 0, y1: 1, z0: 2.9, z1: 3.3 }); // newspaper box
  for (let i = 0; i < 4; i++) V(9 + i * 0.6, 0.15, 3.3, 9.05 + i * 0.6, 0.95, 3.8, M.darkSteel, { cast: false }); // bike rack
  for (const [x, z] of [[-2, 7.2], [10, 9.5], [-18, 8]]) { const mh = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.02, 16), M.darkSteel); mh.position.set(x, 0.005, z); mh.userData.static = true; scene.add(mh); }
  const puddle = new THREE.MeshStandardMaterial({ color: 0x20242a, roughness: 0.02, metalness: 0.8 });
  for (const [x, z, s] of [[-6, 6.5, 1.4], [8, 10.4, 1.1], [-12, 3.4, 0.8], [0.5, 13.5, 0.9]]) { const p = new THREE.Mesh(new THREE.CircleGeometry(s, 16), puddle); p.rotation.x = -Math.PI / 2; p.scale.y = 0.6; p.position.set(x, z < 4 || z > 12 ? 0.152 : 0.004, z); p.userData.static = true; scene.add(p); }
  V(-10.6, 0, -9.9, -8.4, 2.2, -9.7, col(0x5a3a2a, 0.9), { cast: false }); // a door at the end of the alley, bricked up
  for (let i = 0; i < 6; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.35, 0.4), col(0x8a7a5a, 0.95)); b.position.set(-10.6 + R() * 0.6, 0.18 + (i % 3) * 0.35, -8.8 + (i % 2) * 0.5); b.rotation.y = R(); b.userData.static = true; scene.add(b); } // boxes
  // street sign at the corner
  V(-7.05, 0.15, 3.55, -6.95, 3.2, 3.65, M.darkSteel);
  label('CALLOW ST', -7, 3.1, 3.66, 0, 1.2, 0.24, { bg: '#1a5a2a', fg: '#ffffff', font: 'bold 30px Arial' });
  label('CALLOW ST', -7, 3.1, 3.54, Math.PI, 1.2, 0.24, { bg: '#1a5a2a', fg: '#ffffff', font: 'bold 30px Arial' });
  // wires across the street, pole to pole
  for (const x of [-21.5, -9.5, 2.5, 14.5, 26.5]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 14, 4), M.black); w.rotation.x = Math.PI / 2; w.position.set(x, 6.6, 7); w.userData.static = true; scene.add(w); V(x - 0.06, 0.15, 0.6, x + 0.06, 7.0, 0.72, M.darkSteel); }
}
