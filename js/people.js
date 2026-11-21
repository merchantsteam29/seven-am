// People: one jointed body used for everyone (Owen, Mrs. Pell, the clerk, the robber, the man with no face).
// Geometry is shared by every body and materials are cached by colour, so a crowd costs almost nothing.
import * as THREE from 'three';
import * as TX from './tex.js';

const G = {
  head: new THREE.SphereGeometry(0.115, 20, 14),
  neck: new THREE.CylinderGeometry(0.05, 0.055, 0.1, 8),
  torso: new THREE.CapsuleGeometry(0.16, 0.34, 4, 10),
  hips: new THREE.CapsuleGeometry(0.15, 0.08, 4, 10),
  upper: new THREE.CapsuleGeometry(0.052, 0.22, 3, 8),
  lower: new THREE.CapsuleGeometry(0.045, 0.22, 3, 8),
  hand: new THREE.SphereGeometry(0.048, 8, 6),
  thigh: new THREE.CapsuleGeometry(0.075, 0.3, 3, 8),
  shin: new THREE.CapsuleGeometry(0.06, 0.32, 3, 8),
  shoe: new THREE.BoxGeometry(0.11, 0.08, 0.26),
  coat: new THREE.CylinderGeometry(0.2, 0.3, 0.75, 12, 1, true),
  hat: new THREE.CylinderGeometry(0.13, 0.13, 0.12, 14),
  brim: new THREE.CylinderGeometry(0.21, 0.21, 0.015, 18),
  ear: new THREE.SphereGeometry(0.025, 6, 4),
  hairCap: new THREE.SphereGeometry(0.122, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.55),
};
G.shoe.translate(0, 0, 0.05);
const mats = new Map();
const cm = (c, rough = 0.8) => { const k = c + ':' + rough; if (!mats.has(k)) mats.set(k, new THREE.MeshStandardMaterial({ color: c, roughness: rough })); return mats.get(k); };

export const FACES = {
  owen: { skin: 0xd8a888, eye: 0x4a6a8a, hair: 0x3a2a1a, brow: 0x2a1a10, beard: 0x3a2a1a, lips: 0xa05a50, age: 34 },
  pell: { skin: 0xe0b8a0, eye: 0x5a6a5a, hair: 0xc8c8c8, brow: 0x9a9a9a, lips: 0xb06a6a, age: 72 },
  clerk: { skin: 0xa87050, eye: 0x2a1a10, hair: 0x1a1210, brow: 0x1a1210, lips: 0x8a4a40, age: 28 },
  robber: { skin: 0xc89878, eye: 0x3a2a1a, hair: 0x2a2a2a, brow: 0x2a2a2a, beard: 0x2a2020, lips: 0x8a4a40, age: 30 },
  driver: { skin: 0xb88060, eye: 0x2a1a10, hair: 0x4a3a2a, brow: 0x3a2a1a, lips: 0x8a4a40, age: 55, bald: true },
  cop: { skin: 0xd8b098, eye: 0x3a4a5a, hair: 0x6a4a2a, brow: 0x4a3a2a, lips: 0xa05a50, age: 45 },
  walker1: { skin: 0xc89070, eye: 0x2a1a10, hair: 0x1a1a1a, brow: 0x1a1a1a, lips: 0x904a40, age: 25 },
  walker2: { skin: 0xe8c0a8, eye: 0x4a7a5a, hair: 0x8a5a2a, brow: 0x6a4a2a, lips: 0xb06060, age: 40 },
  walker3: { skin: 0x8a5a40, eye: 0x1a1008, hair: 0x101010, brow: 0x101010, lips: 0x7a3a30, age: 60 },
  martin: { skin: 0xc8a090, eye: 0x5a4a3a, hair: 0x5a4a3a, brow: 0x4a3a2a, lips: 0x9a5a50, age: 41 },
};
const faceMat = new Map();
export function faceMaterial(key, faceless = false, raw = false) {
  const k = key + (faceless ? '-none' : '') + (raw ? '-raw' : '');
  if (!faceMat.has(k)) {
    const f = FACES[key];
    const tex = TX.face('face-' + k, faceless ? (f ? { ...f, none: true } : null) : f, raw);
    if (faceless && f) { const g = tex.image.getContext('2d'); g.globalCompositeOperation = 'multiply'; g.fillStyle = '#' + f.skin.toString(16).padStart(6, '0'); g.fillRect(0, 0, 256, 128); g.globalCompositeOperation = 'source-over'; tex.needsUpdate = true; }
    faceMat.set(k, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.65 }));
  }
  return faceMat.get(k);
}

// o: { face, shirt, pants, shoes, coat, hat, faceless, skin }
export function makePerson(o = {}) {
  const f = FACES[o.face || 'owen'];
  const skin = cm(f ? f.skin : 0xc8a890, 0.7), shirt = cm(o.shirt ?? 0x3a5a8a), pants = cm(o.pants ?? 0x2a2a3a), shoes = cm(o.shoes ?? 0x1a1410, 0.6);
  const root = new THREE.Group(), hips = new THREE.Group(), spine = new THREE.Group(), neck = new THREE.Group(), head = new THREE.Group();
  root.add(hips); hips.position.y = 0.95;
  const m = (geo, mt, parent, x = 0, y = 0, z = 0) => { const me = new THREE.Mesh(geo, mt); me.position.set(x, y, z); me.castShadow = true; parent.add(me); return me; };
  m(G.hips, pants, hips, 0, 0.02, 0).rotation.z = Math.PI / 2;
  hips.add(spine); spine.position.y = 0.08;
  const torso = m(G.torso, shirt, spine, 0, 0.27, 0); torso.scale.set(1.12, 1, 0.78);
  spine.add(neck); neck.position.y = 0.56; m(G.neck, skin, neck, 0, 0.03, 0);
  neck.add(head); head.position.y = 0.16;
  const headMesh = m(G.head, faceMaterial(o.face || 'owen', o.faceless), head, 0, 0, 0); headMesh.scale.set(1, 1.12, 1.02);
  m(G.ear, skin, head, -0.112, 0, 0); m(G.ear, skin, head, 0.112, 0, 0);
  if (f && f.hair !== undefined && !f.bald) { const hc = m(G.hairCap, cm(f.hair, 0.95), head, 0, 0.012, -0.008); hc.scale.set(1.03, 1.12, 1.06); }
  const limbs = {};
  for (const s of [-1, 1]) {
    const sh = new THREE.Group(); sh.position.set(s * 0.21, 0.47, 0); spine.add(sh);
    const up = m(G.upper, o.coat ? cm(o.coat) : shirt, sh, 0, -0.15, 0);
    const el = new THREE.Group(); el.position.y = -0.3; sh.add(el);
    m(G.lower, o.coat ? cm(o.coat) : (o.shortSleeves ? skin : shirt), el, 0, -0.14, 0); m(G.hand, skin, el, 0, -0.31, 0.01);
    const hp = new THREE.Group(); hp.position.set(s * 0.09, -0.02, 0); hips.add(hp);
    m(G.thigh, pants, hp, 0, -0.22, 0);
    const kn = new THREE.Group(); kn.position.y = -0.45; hp.add(kn);
    m(G.shin, pants, kn, 0, -0.22, 0); m(G.shoe, shoes, kn, 0, -0.46, 0);
    limbs[s < 0 ? 'L' : 'R'] = { sh, el, hp, kn, up };
  }
  if (o.coat) { const c = m(G.coat, cm(o.coat), spine, 0, 0.12, 0); c.material.side = THREE.DoubleSide; c.scale.set(1.1, 1, 0.85); }
  if (o.hat) { m(G.hat, cm(o.hat, 0.9), head, 0, 0.13, 0); m(G.brim, cm(o.hat, 0.9), head, 0, 0.08, 0); }
  const rig = { root, hips, spine, neck, head, headMesh, limbs, phase: Math.random() * 6, opts: o, faceKey: o.face || 'owen', faceless: !!o.faceless };
  return rig;
}
export function setFaceless(rig, on, raw = false) { rig.faceless = on; rig.headMesh.material = faceMaterial(rig.faceKey, on, raw); }
export function setLayer(rig, n) { rig.root.traverse((c) => c.layers.set(n)); }

// walk = 0 standing, 1 walking, 2 running. look = head yaw/pitch (radians, relative)
export function animate(rig, dt, walk = 0, t = 0, look = null) {
  rig.phase += dt * (walk > 1.5 ? 11 : 7.2) * Math.min(1, walk);
  const p = rig.phase, a = Math.min(1, walk) * (walk > 1.5 ? 1.0 : 0.55);
  const { L, R } = rig.limbs;
  L.hp.rotation.x = Math.sin(p) * a; R.hp.rotation.x = -Math.sin(p) * a;
  L.kn.rotation.x = Math.max(0, -Math.cos(p)) * a * 1.3; R.kn.rotation.x = Math.max(0, Math.cos(p)) * a * 1.3;
  L.sh.rotation.x = -Math.sin(p) * a * 0.8; R.sh.rotation.x = Math.sin(p) * a * 0.8;
  L.el.rotation.x = -0.15 - a * 0.4; R.el.rotation.x = -0.15 - a * 0.4;
  L.sh.rotation.z = -0.06; R.sh.rotation.z = 0.06;
  rig.hips.position.y = 0.95 + Math.abs(Math.sin(p)) * a * 0.05 + Math.sin(t * 1.7) * 0.004;
  rig.spine.rotation.x = walk > 1.5 ? 0.18 : 0.02;
  rig.spine.rotation.y = Math.sin(p) * a * 0.12;
  if (look) { rig.neck.rotation.y = look[0]; rig.head.rotation.x = look[1]; }
}
// pose helpers for scripted moments
export function pose(rig, name, t = 0) {
  const { L, R } = rig.limbs;
  if (name === 'reach') { L.sh.rotation.x = R.sh.rotation.x = -1.4; L.el.rotation.x = R.el.rotation.x = -0.2; L.sh.rotation.z = 0.15; R.sh.rotation.z = -0.15; }
  if (name === 'gun') { R.sh.rotation.x = -1.5; R.el.rotation.x = 0; L.sh.rotation.x = -1.3; L.sh.rotation.z = 0.5; L.el.rotation.x = -0.4; }
  if (name === 'stand') { for (const s of [L, R]) { s.sh.rotation.set(0, 0, 0); s.el.rotation.set(0, 0, 0); s.hp.rotation.set(0, 0, 0); s.kn.rotation.set(0, 0, 0); } L.sh.rotation.z = -0.06; R.sh.rotation.z = 0.06; rig.spine.rotation.set(0, 0, 0); }
  if (name === 'wrong') { // standing too still, head cocked too far
    rig.neck.rotation.z = 0.5 + Math.sin(t * 0.7) * 0.05; L.sh.rotation.x = R.sh.rotation.x = 0; L.el.rotation.x = R.el.rotation.x = 0;
  }
  if (name === 'lie') { rig.hips.rotation.x = -Math.PI / 2; rig.hips.position.y = 0.12; }
  if (name === 'sit') { L.hp.rotation.x = R.hp.rotation.x = -1.5; L.kn.rotation.x = R.kn.rotation.x = 1.5; rig.hips.position.y = 0.5; }
}
// the man with no face: tall, a long grey coat, nothing where his face should be
export function makeFaceless() {
  const r = makePerson({ face: 'martin', faceless: true, shirt: 0x5a5a60, pants: 0x3a3a40, coat: 0x6a6a6e, shoes: 0x1a1a1a });
  r.root.scale.setScalar(1.1);
  return r;
}
