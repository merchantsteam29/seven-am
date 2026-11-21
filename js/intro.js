// The night before. Route 9, 1:14 AM, rain. Owen has been drinking. Someone is standing in the road.
// Built far away from the street (z -400 and beyond) and only shown during the cutscene.
import * as THREE from 'three';
import { makeFaceless, makePerson, animate, pose } from './people.js';
import * as TX from './tex.js';

const Z0 = -420; // where the crash happens
export function createIntro({ scene, camera, A, voice, ui, U }) {
  const root = new THREE.Group(); root.visible = false; scene.add(root);
  // the road, the verges, the woods (instanced: hundreds of trees, two draw calls)
  const asph = TX.asphalt('asph2', 41); asph.repeat.set(2, 120);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(8, 600), new THREE.MeshStandardMaterial({ map: asph, roughness: 0.25, metalness: 0.3, color: 0x666670 })); road.rotation.x = -Math.PI / 2; road.position.set(0, 0.01, Z0 - 100); road.receiveShadow = true; root.add(road);
  const verge = new THREE.Mesh(new THREE.PlaneGeometry(80, 600), new THREE.MeshStandardMaterial({ color: 0x0e140c, roughness: 1 })); verge.rotation.x = -Math.PI / 2; verge.position.set(0, 0, Z0 - 100); root.add(verge);
  const lines = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.14, 3), new THREE.MeshStandardMaterial({ color: 0xd8c060, roughness: 0.5 }), 60);
  for (let i = 0; i < 60; i++) { const m = new THREE.Matrix4().makeRotationX(-Math.PI / 2); m.setPosition(0, 0.02, Z0 + 180 - i * 8); lines.setMatrixAt(i, m); } root.add(lines);
  const N = 320, trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.18, 0.28, 6, 6), new THREE.MeshStandardMaterial({ color: 0x1a140e, roughness: 1 }), N);
  const crowns = new THREE.InstancedMesh(new THREE.ConeGeometry(2.2, 7, 7), new THREE.MeshStandardMaterial({ color: 0x0c1a10, roughness: 1 }), N);
  const r = TX.rng(77), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3();
  for (let i = 0; i < N; i++) {
    const side = i % 2 ? 1 : -1, x = side * (6 + r() * 30), z = Z0 + 200 - r() * 500, k = 0.7 + r() * 0.8;
    m4.compose(new THREE.Vector3(x, 3 * k, z), q.identity(), s.set(k, k, k)); trunks.setMatrixAt(i, m4);
    m4.compose(new THREE.Vector3(x, 8 * k, z), q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), r() * 6), s.set(k, k, k)); crowns.setMatrixAt(i, m4);
  }
  root.add(trunks, crowns);
  // the car: you see the inside of it, then the outside
  const car = new THREE.Group(); root.add(car);
  const dark = new THREE.MeshStandardMaterial({ color: 0x18181c, roughness: 0.7 }), body = new THREE.MeshStandardMaterial({ color: 0x1a2a5a, roughness: 0.3, metalness: 0.6 });
  const add = (g, x0, y0, z0, x1, y1, z1, mt) => { const b = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), mt); b.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); g.add(b); return b; };
  add(car, -0.95, 0.3, -2.2, 0.95, 0.95, 2.2, body); // the shell (car points -z)
  add(car, -0.9, 0.95, -0.9, 0.9, 1.0, -0.4, dark); // dashboard
  add(car, -0.9, 0.95, 0.6, 0.9, 1.45, 1.6, body); // the back
  add(car, -0.88, 1.42, -0.9, 0.88, 1.48, 0.9, body); // roof
  for (const x of [-0.85, 0.85]) { const p = add(car, x - 0.04, 0.95, -0.95, x + 0.04, 1.45, -0.85, dark); p.rotation.x = -0.4; }
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.025, 8, 24), dark); wheel.position.set(-0.38, 1.05, -0.45); wheel.rotation.x = -1.1; car.add(wheel);
  const dashTex = TX.screen(128, 48); const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.08), new THREE.MeshBasicMaterial({ map: dashTex })); dash.position.set(0.05, 1.03, -0.62); dash.rotation.x = -0.9; car.add(dash);
  const phoneTex = TX.screen(64, 112); const phone = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.13), new THREE.MeshBasicMaterial({ map: phoneTex })); phone.position.set(0.12, 0.88, -0.55); phone.rotation.x = -1.1; car.add(phone);
  const drawDash = (txt) => { const g = dashTex.g; g.fillStyle = '#020804'; g.fillRect(0, 0, 128, 48); g.fillStyle = '#40ff90'; g.font = 'bold 30px monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, 64, 26); dashTex.needsUpdate = true; };
  const drawPhone = (on) => { const g = phoneTex.g; g.fillStyle = on ? '#203050' : '#000'; g.fillRect(0, 0, 64, 112); if (on) { g.fillStyle = '#fff'; g.font = 'bold 12px Arial'; g.textAlign = 'center'; g.fillText('DANA', 32, 40); g.fillStyle = '#30c050'; g.beginPath(); g.arc(20, 88, 9, 0, 7); g.fill(); g.fillStyle = '#d03030'; g.beginPath(); g.arc(44, 88, 9, 0, 7); g.fill(); } phoneTex.needsUpdate = true; };
  // the windscreen and the crack across it
  const crackTex = (() => { const t = TX.screen(256, 128), g = t.g; g.clearRect(0, 0, 256, 128); g.strokeStyle = 'rgba(230,240,255,0.75)'; g.lineWidth = 1.2; const R = TX.rng(5); for (let i = 0; i < 18; i++) { g.beginPath(); let x = 150, y = 60; g.moveTo(x, y); const a = R() * 6.28; for (let k = 0; k < 6; k++) { x += Math.cos(a + (R() - 0.5)) * 18; y += Math.sin(a + (R() - 0.5)) * 18; g.lineTo(x, y); } g.stroke(); } for (let k = 1; k < 4; k++) { g.beginPath(); g.arc(150, 60, k * 14, 0, 7); g.stroke(); } t.needsUpdate = true; return t; })();
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.55), new THREE.MeshBasicMaterial({ map: crackTex, transparent: true, opacity: 0, depthWrite: false })); glass.position.set(0, 1.22, -0.88); glass.rotation.x = -0.4; car.add(glass);
  const blood = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.3), new THREE.MeshBasicMaterial({ map: TX.splat(9), transparent: true, opacity: 0, depthWrite: false })); blood.position.set(0.25, 1.21, -0.89); blood.rotation.x = -0.4; car.add(blood);
  // headlights
  const hl = [-0.6, 0.6].map((x) => { const l = new THREE.SpotLight(0xf0f0ff, 0, 45, 0.42, 0.5, 1.2); l.position.set(x, 0.7, -2.2); l.target.position.set(x * 0.3, 0, -25); car.add(l, l.target); return l; });
  const tail = add(car, -0.8, 0.6, 2.18, 0.8, 0.75, 2.22, new THREE.MeshStandardMaterial({ color: 0x300000, emissive: 0xff1000, emissiveIntensity: 1.2 }));
  void tail;
  // rain: one set of streaks that follows the camera
  const RN = 1400, rpos = new Float32Array(RN * 6), rainGeo = new THREE.BufferGeometry();
  for (let i = 0; i < RN; i++) { const x = (Math.random() - 0.5) * 30, y = Math.random() * 14, z = (Math.random() - 0.5) * 30; rpos.set([x, y, z, x, y - 0.35, z], i * 6); }
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rpos, 3));
  const rain = new THREE.LineSegments(rainGeo, new THREE.LineBasicMaterial({ color: 0x8090a8, transparent: true, opacity: 0.45 })); rain.frustumCulled = false; root.add(rain);
  // him
  const man = makeFaceless(); man.root.visible = false; root.add(man.root);
  const hat = makePerson; void hat;
  let t = 0, eng = null, rainLoop = null, said = {}, hold = 0, wipT = 0, carZ = 0, speed = 0, done = false;
  const say = (who, text, dur) => { ui.sub(who === 'OWEN' ? `<i>${text}</i>` : text, dur, who === 'HIM' ? 'him' : 'think'); voice.say(who, text); };
  const once = (k, at, fn) => { if (!said[k] && t >= at) { said[k] = true; fn(); } };

  return {
    root,
    start() {
      root.visible = true; t = 0; said = {}; hold = 0; done = false; carZ = Z0 + 137.4; speed = 17;
      car.position.set(1.8, 0, carZ); car.rotation.set(0, 0, 0); glass.material.opacity = 0; blood.material.opacity = 0;
      man.root.visible = true; man.root.position.set(1.8, 0, Z0); man.root.rotation.set(0, 0, 0); pose(man, 'stand'); man.hips.rotation.set(0, 0, 0); man.neck.rotation.set(0, 0, 0);
      hl.forEach((l) => (l.intensity = 120)); drawDash('1:14'); drawPhone(false);
      eng = A.engine(car.position, { freq: 34, vol: 0.12, cutoff: 400 });
      U.black.value = 1;
    },
    // hold to skip; returns true when finished
    update(dt, skipHeld) {
      t += dt;
      if (skipHeld) { hold += dt; if (hold > 1.1) return this.finish(); } else hold = Math.max(0, hold - dt * 2);
      ui.skip(hold / 1.1);
      if (t < 1.2) U.black.value = 1 - t / 1.2; else if (t < 10.8) U.black.value = 0;
      // the drive
      if (t < 8.0) { carZ -= speed * dt; } else if (t < 9.2) { speed = Math.max(0, speed - dt * 18); carZ -= speed * dt; }
      // he is standing where the car will be at 8.0 s
      if (t < 0.05) man.root.position.z = Z0;
      car.position.z = carZ;
      if (eng) eng.set(car.position.clone().setY(1), t < 7.6 ? 1 : 0.6, t < 9 ? 0.12 : 0.05);
      // inside the car
      const insideCam = t < 10.9;
      if (insideCam) {
        let pitch = -0.04, yaw = 0, sh = 0;
        if (t > 5.8 && t < 7.3) pitch = -0.55; // looking down at the phone
        if (t > 7.95 && t < 8.6) sh = 0.05;
        if (t > 8.6) pitch = -0.08 + Math.sin(t * 2) * 0.01;
        camera.position.set(car.position.x - 0.38 + (Math.random() - 0.5) * sh, 1.25 + (Math.random() - 0.5) * sh + Math.sin(t * 9) * 0.004, car.position.z - 0.1);
        camera.rotation.set(camera.rotation.x + (pitch - camera.rotation.x) * Math.min(1, dt * 7), yaw, Math.sin(t * 0.6) * 0.01 + (Math.random() - 0.5) * sh);
      }
      once('a', 1.5, () => say('OWEN', 'I\'m fine. I\'m fine. Five more minutes.', 3.5));
      once('ph', 4.6, () => { drawPhone(true); A.beep(0.05, 700, 0.15); setTimeout(() => A.beep(0.05, 700, 0.15), 400); });
      once('b', 5.8, () => say('OWEN', 'Not now, Dana.', 2));
      once('ph2', 7.2, () => drawPhone(false));
      once('see', 7.3, () => { A.horn(car.position, 0.6, false); A.screech(car.position, 1.6); });
      once('hit', 7.95, () => { A.thud(null, 1, 0, 55); A.crunch(null, 0.9); A.glass(null, 0.4); glass.material.opacity = 0.9; blood.material.opacity = 0.85;
        // he goes over the bonnet and lands in the road ahead
        man.hips.rotation.x = -Math.PI / 2; man.hips.position.y = 0.14; man.root.position.set(1.4, 0, car.position.z - 9); man.root.rotation.y = 0.6; });
      once('quiet', 9.2, () => { eng?.set(car.position, 0.5, 0.03); });
      once('c', 9.6, () => say('OWEN', 'A deer. It was a deer. It was...', 3.5));
      // outside: walking up to him in the headlights
      if (!insideCam) {
        once('out', 10.9, () => { U.black.value = 1; A.doorSound(null, true); });
        if (t > 11.3) U.black.value = Math.max(0, 1 - (t - 11.3) * 2);
        const walk = Math.min(1, Math.max(0, (t - 11.5) / 3.5));
        const cx = car.position.x - 1.3, cz = car.position.z - 1.5 - walk * 4.5;
        const target = man.head.getWorldPosition(new THREE.Vector3());
        camera.position.set(cx, 1.65 + Math.sin(t * 6) * 0.02 * walk, cz);
        camera.lookAt(target.x, Math.min(1.6, target.y), target.z);
        if (t > 11.5 && t < 15 && Math.floor(t * 1.6) !== Math.floor((t - dt) * 1.6)) A.step(camera.position, 'concrete', 0.18);
        // he moves
        once('tw', 13.2, () => A.crack(man.root.position, 0));
        if (t > 15 && t < 17) { const k = (t - 15) / 2; man.hips.rotation.x = -Math.PI / 2 * (1 - k); man.hips.position.y = 0.14 + 0.81 * k; man.root.rotation.y = 0.6 * (1 - k) + Math.PI * k * 0.0; if (Math.random() < dt * 6) A.crack(man.root.position, 0); }
        if (t > 17) { man.root.rotation.y += (Math.atan2(camera.position.x - man.root.position.x, camera.position.z - man.root.position.z) - man.root.rotation.y) * Math.min(1, dt * 1.5); animate(man, dt, 0, t); }
        once('face', 17.8, () => { A.presence(0.5, 4); A.sting(0.5); });
        once('late', 19.0, () => say('HIM', 'You\'re late.', 2.5));
        if (t > 20.3) { const k = Math.min(1, (t - 20.3) / 0.3); man.root.position.lerp(new THREE.Vector3(camera.position.x, 0, camera.position.z - 0.5), k * 0.4); pose(man, 'reach'); }
        once('lunge', 20.3, () => { A.scream(null, 0.7, 0.6); });
        if (t > 20.6) U.black.value = 1;
        if (t > 21.4) return this.finish();
      }
      // rain and wipers
      const p = rainGeo.attributes.position.array, cam = camera.position;
      for (let i = 0; i < RN; i++) { const o = i * 6; let y = p[o + 1] - dt * 18; if (y < 0) { y += 14; p[o] = cam.x + (Math.random() - 0.5) * 30; p[o + 2] = cam.z + (Math.random() - 0.5) * 30 - 6; p[o + 3] = p[o]; p[o + 5] = p[o + 2]; } p[o + 1] = y; p[o + 4] = y - 0.35; }
      rainGeo.attributes.position.needsUpdate = true;
      if (insideCam && (wipT -= dt) < 0) { wipT = 1.1; A.wiper(0.05); }
      return false;
    },
    finish() {
      if (done) return true; done = true;
      root.visible = false; eng?.stop(); eng = null; rainLoop?.stop?.(); hl.forEach((l) => (l.intensity = 0)); ui.skip(0); voice.cancel();
      return true;
    },
    get t() { return t; },
  };
}
