// How Owen dies. Every death has a first-person moment (always) and, with Gore set to Full, a few seconds
// afterwards looking at what is left of him. With Quick cut it goes to black at the moment of impact.
import * as THREE from 'three';
import { makePerson, makeFaceless, animate, pose, setFaceless } from './people.js';
import { Y4 } from './world.js';

const OWEN = { face: 'owen', shirt: 0x6a7078, pants: 0x2a3040, shoes: 0x2a1a10 };
const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
const UP = v3(0, 1, 0);

export function createDeaths(c) {
  const { scene, camera, P, A, gore, U, W } = c;
  let body = null, extra = [], fireL = null;
  const charred = new THREE.MeshStandardMaterial({ color: 0x1a0c08, roughness: 1, emissive: 0x401000, emissiveIntensity: 0.4 });
  function makeBody() { body?.root.parent?.remove(body.root); body = makePerson(OWEN); scene.add(body.root); return body; }
  function cleanup() {
    body?.root.parent?.remove(body.root); body = null;
    for (const e of extra) e.parent?.remove(e); extra = [];
    if (fireL) { scene.remove(fireL); fireL = null; }
    gore.clear();
    document.getElementById('bloodFX').className = '';
  }
  const blood = (k) => { document.getElementById('bloodFX').className = 'on ' + k; };
  const look = (from, at, roll = 0) => { camera.position.copy(from); camera.lookAt(at); camera.rotateZ(roll); camera.updateMatrixWorld(); };
  const eye = () => v3(P.x, P.y + 1.62, P.z);
  const fwd = () => v3(-Math.sin(P.yaw), 0, -Math.cos(P.yaw));
  const fpCam = (shake = 0, roll = 0, dy = 0, dpitch = 0, dyaw = 0) => {
    camera.position.set(P.x + (Math.random() - 0.5) * shake, P.y + 1.62 + dy + (Math.random() - 0.5) * shake, P.z + (Math.random() - 0.5) * shake);
    camera.rotation.set(P.pitch + dpitch, P.yaw + dyaw, roll); camera.updateMatrixWorld();
  };
  // turn your head towards a point
  const turnTo = (x, y, z, dt, k = 8) => {
    const want = Math.atan2(-(x - P.x), -(z - P.z)); let d = want - P.yaw; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
    P.yaw += d * Math.min(1, dt * k); const wp = Math.atan2(y - (P.y + 1.62), Math.hypot(x - P.x, z - P.z)); P.pitch += (wp - P.pitch) * Math.min(1, dt * k);
  };
  const lay = (b, x, y, z, yaw, back = true) => { b.root.position.set(x, y, z); b.root.rotation.set(0, yaw, 0); pose(b, 'stand'); b.hips.rotation.x = back ? -Math.PI / 2 : Math.PI / 2; b.hips.position.y = 0.13; };

  const KINDS = {
    // ---- the gas: the click of the burner, and the room turns white ----
    gas: {
      fp: 1.1, fpU(t, dt) {
        if (t < 0.02 && !this.boom) { this.boom = true; A.explosion(v3(1.3, Y4 + 1, -5.6), 1); A.fire(v3(1.3, Y4 + 1, -5.6), 6); blood('burn'); }
        U.flash.value = Math.max(0, 1.4 - t * 2.5); U.red.value = Math.min(0.5, t);
        fpCam(0.15 * (1 - t), t * 1.2, -t * 0.9, 0.6 * t, 0);
        if (t > 0.75) U.black.value = (t - 0.75) * 3;
      },
      tp: 4.2, tpStart() {
        const b = makeBody(); const f = fwd();
        lay(b, 1.5, Y4, -3.9, 0.3); void f;
        b.root.traverse((m) => { if (m.isMesh) m.material = charred; });
        gore.loose(b.limbs.R.sh, v3(f.x * -3 + 1, 3, f.z * -3), 9); gore.loose(b.limbs.L.kn, v3(-f.x * 2, 2, -f.z * 2 + 1), 7);
        gore.spray(b.root.position.clone().add(v3(0, 0.3, 0)), UP, 120, 4, 1);
        gore.pool(v3(b.root.position.x, P.y, b.root.position.z), 1.6, 0.25);
        for (let i = 0; i < 6; i++) gore.splat(v3(P.x + (Math.random() - 0.5) * 3, P.y, P.z + (Math.random() - 0.5) * 3), 0.3 + Math.random() * 0.4);
        fireL = new THREE.PointLight(0xff6020, 30, 9, 2); fireL.position.set(1.3, Y4 + 1.3, -5); scene.add(fireL);
        // fire on the stove and the counter
        for (let i = 0; i < 5; i++) { const fl = new THREE.Mesh(new THREE.ConeGeometry(0.2 + Math.random() * 0.2, 0.6 + Math.random() * 0.6, 7), new THREE.MeshBasicMaterial({ color: 0xff7020, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false })); fl.position.set(0.6 + i * 0.6, Y4 + 1.25, -5.6); scene.add(fl); extra.push(fl); }
        U.flash.value = 0; U.black.value = 0; U.red.value = 0.12;
      },
      tpU(t) {
        if (fireL) fireL.intensity = 24 + Math.random() * 16;
        extra.forEach((f, i) => { f.scale.y = 0.8 + Math.sin(t * 13 + i) * 0.3; f.material.opacity = 0.6 + Math.random() * 0.3; });
        const bp = body.root.position; look(v3(4.6, Y4 + 2.3, -0.6), v3(bp.x, Y4 + 0.3, bp.z));
      },
    },
    // ---- the elevator: the doors close, the light flickers, the floor falls away ----
    elevator: {
      fp: 3.4, fpU(t, dt) {
        if (!this.a && t > 0.3) { this.a = true; A.click(0.4); }
        if (!this.b && t > 1.0) { this.b = true; A.cable(v3(6.3, Y4 + 2.5, -9)); }
        const fall = t > 1.2;
        if (fall) { if (!this.eng) this.eng = A.engine(v3(P.x, P.y + 2, P.z), { freq: 90, vol: 0.2, cutoff: 2500 }); this.eng.set(v3(P.x, P.y + 2, P.z), 1 + (t - 1.2) * 1.5); }
        W.meshes.elevPanel.material.emissiveIntensity = fall ? (Math.random() < 0.5 ? 0 : 2) : 1;
        // the car drops: you float up off the floor
        fpCam(fall ? 0.05 : 0, fall ? Math.sin(t * 9) * 0.05 : 0, fall ? Math.min(0.5, (t - 1.2) * 0.6) : 0, fall ? 0.3 : 0);
        U.red.value = fall ? (t - 1.2) * 0.1 : 0;
        if (!this.c && t > 3.1) { this.c = true; this.eng?.stop(); A.crunch(null, 1); A.explosion(null, 0.5); blood('heavy'); U.black.value = 1; }
      },
      tp: 4.5, tpStart() {
        // the lobby, a moment later: the doors bent outwards, an arm between them, the pool spreading
        A.thud(v3(6.3, 0.5, -8), 1, 0.3, 40); W.meshes.elev0L.position.x = 5.9; W.meshes.elev0R.position.x = 6.74; W.meshes.elev0L.rotation.y = 0.08; W.meshes.elev0R.rotation.y = -0.08;
        const b = makeBody(); b.root.visible = false;
        const arm = b.limbs.L.sh; gore.loose(arm, v3(0, 0, 0.2), 0, true);
        arm.position.set(6.32, 0.12, -7.95); arm.rotation.set(Math.PI / 2, 0, 0.2);
        gore.pool(v3(6.3, 0.0, -7.6), 1.8, 0.35); gore.splat(v3(6.3, 0.0, -7.9), 0.6);
        U.black.value = 0; U.red.value = 0.08;
        this.drip = 0;
      },
      tpU(t, dt) { look(v3(3.2, 1.5, -3.6), v3(6.3, 0.3, -7.9)); if ((this.drip -= dt) < 0) { this.drip = 0.25; gore.spray(v3(6.3, 1.2 + Math.random() * 0.8, -7.97), v3(0, -1, 0.2), 2, 0.4, 0.2); } },
    },
    // ---- the air conditioner ----
    ac: {
      fp: 0.55, fpU(t, dt) {
        turnTo(W.meshes.ac.position.x, 7, W.meshes.ac.position.z, dt, 20);
        W.meshes.ac.position.y = Math.max(P.y + 1.8, 3 - t * 9);
        fpCam(0, 0, 0, 0);
        if (t > 0.42 && !this.hit) { this.hit = true; A.crunch(null, 1); blood('heavy'); U.black.value = 1; }
      },
      tp: 4.2, tpStart() {
        const b = makeBody(); lay(b, P.x, 0.15, P.z, Math.PI);
        b.head.visible = false;
        W.meshes.ac.position.set(P.x, 0.45, P.z + 0.75); W.meshes.ac.rotation.set(0.2, 0.4, 0.1);
        const neck = v3(P.x, 0.3, P.z + 0.6);
        gore.spray(neck, v3(0, 0.6, 1), 160, 6, 1.2); gore.spray(neck, v3(0, 1, 0), 60, 3, 1.5);
        gore.pool(v3(P.x, 0.15, P.z + 0.8), 2.0, 0.4);
        gore.splat(v3(P.x + 0.6, 1.0, 0.16), 0.8, v3(0, 0, 1)); gore.splat(v3(P.x - 0.7, 0.7, 0.16), 0.6, v3(0, 0, 1));
        U.black.value = 0; U.red.value = 0.1;
      },
      tpU(t) { look(v3(P.x + 1.6, 1.5, P.z + 2.8), v3(P.x, 0.25, P.z + 0.3)); },
    },
    // ---- the truck ----
    truck: {
      fp: 0.75, fpU(t, dt, info) {
        const tr = info.truck; turnTo(tr.position.x, 1.6, 7, dt, 14);
        tr.position.x = Math.min(P.x + 0.5, tr.position.x + dt * 21);
        fpCam(0.02, 0, 0, 0);
        if (!this.h) { this.h = true; A.horn(tr.position, 0.8, true); A.screech(tr.position, 0.8); }
        U.flash.value = t * 0.3;
        if (t > 0.6 && !this.hit) { this.hit = true; A.crunch(null, 1); A.thud(null, 1, 0, 45); blood('heavy'); U.black.value = 1; U.flash.value = 0; }
      },
      tp: 4.5, tpStart(info) {
        const tr = info.truck; tr.position.x = P.x + 26; info.truck.visible = true;
        const b = makeBody(); b.root.position.set(P.x + 2, 0.4, P.z); b.root.rotation.y = -Math.PI / 2;
        gore.loose(b.limbs.L.hp, v3(8, 4, 0.8), 14); gore.loose(b.limbs.R.sh, v3(10, 5, -1.2), 16); gore.loose(b.limbs.R.kn, v3(6, 3, 1.5), 12);
        gore.loose(b.root, v3(7, 3.5, 0.3), 5);
        gore.spray(v3(P.x + 2, 1.0, P.z), v3(1, 0.4, 0), 200, 9, 0.5);
        for (let i = 0; i < 10; i++) gore.splat(v3(P.x + 2 + i * 0.9, 0.0, P.z + (Math.random() - 0.5) * 0.6), 0.4 + Math.random() * 0.5);
        A.screech(tr.position, 2.5);
        U.black.value = 0; U.red.value = 0.08;
        this.c = v3(P.x + 3, 1.7, 3.2);
      },
      tpU(t) { const b = body.root.position; look(this.c, v3(b.x, 0.4, b.z)); },
    },
    // ---- the robbery ----
    robbery: {
      fp: 0.9, fpU(t, dt, info) {
        const r = info.robber.root; turnTo(r.position.x, 1.5, r.position.z, dt, 14);
        fpCam(0, 0, 0, 0);
        if (t > 0.35 && !this.bang) { this.bang = true; A.gunshot(r.position, 1); U.flash.value = 0.8; blood('heavy'); }
        if (this.bang) { U.flash.value = Math.max(0, U.flash.value - dt * 4); fpCam(0.03, (t - 0.35) * 0.8, -(t - 0.35) * 1.4, 0.4); U.red.value = 0.3; if (t > 0.7) U.black.value = 1; }
      },
      tp: 4.0, tpStart(info) {
        const b = makeBody(); b.root.position.set(P.x, 0.15, P.z); b.root.rotation.y = P.yaw; pose(b, 'stand'); pose(b, 'sit'); b.hips.position.y = 0.35; b.spine.rotation.x = -0.4; b.neck.rotation.z = 0.6;
        b.limbs.L.sh.rotation.z = -0.4; b.limbs.R.sh.rotation.z = 0.4;
        const chest = v3(P.x, 1.0, P.z);
        gore.spray(chest, fwd().multiplyScalar(-1).add(v3(0, 0.3, 0)), 180, 6, 0.7);
        gore.pool(v3(P.x, 0.16, P.z), 1.5, 0.3);
        for (let i = 0; i < 4; i++) gore.splat(v3(P.x + (Math.random() - 0.5) * 1.5, 0.16, P.z + (Math.random() - 0.5) * 1.5), 0.3);
        const r = info.robber.root; r.rotation.y = Math.PI; this.r = r;
        U.black.value = 0; U.red.value = 0.08; U.flash.value = 0;
      },
      tpU(t, dt, info) { if (this.r.position.z > 15) { this.r.position.z -= dt * 3; animate(info.robber, dt, 2, t); } look(v3(9.6, 2.6, 17), v3(P.x, 0.6, P.z)); },
    },
    // ---- the push ----
    push: {
      fp: 1.1, fpU(t, dt, info) {
        const bus = info.bus;
        if (!this.s) { this.s = true; A.horn(bus.position, 1.2, true); A.screech(bus.position, 1); }
        if (t < 0.4) { P.z -= dt * 3.5; P.pitch += (-0.3 - P.pitch) * dt * 6; } // shoved forward, off the curb
        else turnTo(bus.position.x, 1.8, 10.6, dt, 16);
        P.y = Math.max(0, P.y - dt * 0.5);
        bus.position.x = Math.max(P.x + 0.4, bus.position.x - dt * 9);
        fpCam(0.02, t < 0.4 ? -t * 0.4 : 0, 0, 0);
        if (t > 0.95 && !this.hit) { this.hit = true; A.crunch(null, 1); A.thud(null, 1, 0, 40); blood('heavy'); U.black.value = 1; }
      },
      tp: 4.6, tpStart(info) {
        const bus = info.bus; bus.position.x = P.x + 1.1;
        const b = makeBody(); lay(b, P.x + 0.1, 0.0, 11.2, -Math.PI / 2, false);
        gore.loose(b.limbs.L.hp, v3(-1, 2, -2), 5); b.limbs.R.hp.rotation.x = 1.2;
        gore.spray(v3(P.x + 0.4, 0.3, 11), v3(0, 0.5, 1), 140, 5, 1);
        gore.pool(v3(P.x + 0.1, 0.0, 11.0), 2.2, 0.5);
        const h = makeFaceless(); h.root.position.set(P.x + 1.6, 0.15, 12.6); h.root.rotation.y = Math.PI; h.head.rotation.x = 0.6; scene.add(h.root); extra.push(h.root); this.h = h;
        U.black.value = 0; U.red.value = 0.08;
      },
      tpU(t, dt) { animate(this.h, dt, 0, t); this.h.head.rotation.x = 0.6; look(v3(P.x - 2.2, 2.3, 13.6), v3(P.x + 0.3, 0.2, 11)); },
    },
    // ---- him: he takes your face ----
    him: {
      fp: 2.6, fpU(t, dt, info) {
        const h = info.him || (this.hh || (this.hh = (() => { const r = makeFaceless(); scene.add(r.root); extra.push(r.root); return r; })()));
        const f = fwd();
        if (!this.placed) { this.placed = true; h.root.visible = true; h.root.position.set(P.x + f.x * 0.55, P.y, P.z + f.z * 0.55); h.root.rotation.y = Math.atan2(-f.x, -f.z); A.presence(0.6, 3); A.sting(0.7); }
        animate(h, dt, 0, t); pose(h, 'reach');
        turnTo(h.root.position.x, P.y + 1.85, h.root.position.z, dt, 12);
        fpCam(0.01 + t * 0.01, Math.sin(t * 30) * 0.01 * t, 0, 0);
        U.black.value = Math.min(1, Math.max(0, (t - 1.0) * 0.4)); U.red.value = Math.min(0.4, t * 0.2);
        if (t > 1.6 && !this.tear) { this.tear = true; A.splat(null, 0.9); A.crack(null, 0); A.scream(null, 0.5, 1); blood('heavy'); }
        if (t > 2.3) U.black.value = 1;
      },
      tp: 5.0, tpStart(info) {
        // Owen stands where he was, swaying, with nothing where his face was. The man walks away wearing it.
        const b = makeBody(); b.root.position.set(P.x, P.y, P.z); b.root.rotation.y = P.yaw + Math.PI; setFaceless(b, true, true); this.b = b;
        const h = info.him || this.hh; h.root.visible = true; this.h = h;
        h.headMesh.material = b.headMesh.material.clone(); h.headMesh.material = makePerson(OWEN).headMesh.material;
        const chin = v3(P.x, P.y + 1.55, P.z);
        gore.spray(chin, v3(0, -1, 0), 40, 1, 0.4); gore.pool(v3(P.x, P.y, P.z), 0.9, 0.15);
        this.dir = fwd().multiplyScalar(-1);
        const fl = new THREE.PointLight(0xffd8c0, 6, 4, 2); fl.position.copy(chin).addScaledVector(fwd(), 1.1); scene.add(fl); extra.push(fl);
        U.black.value = 0; U.red.value = 0.1;
      },
      tpU(t, dt) {
        animate(this.b, dt, 0, t); this.b.spine.rotation.z = Math.sin(t * 1.3) * 0.06;
        if (t > 1.5) { this.h.root.position.addScaledVector(v3(Math.sin(this.h.root.rotation.y), 0, Math.cos(this.h.root.rotation.y)), dt * 0.9); animate(this.h, dt, 1, t); }
        if (Math.random() < dt * 6) gore.spray(v3(P.x, P.y + 1.5, P.z), v3(0, -1, 0), 3, 0.5, 0.3);
        const f = fwd(); look(v3(P.x + f.x * 2.2 + 0.6, P.y + 1.7, P.z + f.z * 2.2), v3(P.x, P.y + 1.4, P.z));
      },
    },
  };
  KINDS.late = { ...KINDS.him };

  let cur = null;
  return {
    start(kind, info = {}, full = false) {
      cleanup();
      const k = Object.create(KINDS[kind] || KINDS.him);
      cur = { k, kind, info, full, t: 0, phase: 'fp' };
      U.black.value = 0; U.red.value = 0; U.flash.value = 0;
    },
    // returns true when it's over
    update(dt) {
      if (!cur) return true;
      const { k, info } = cur; cur.t += dt;
      if (cur.phase === 'fp') {
        k.fpU(cur.t, dt, info);
        if (cur.t >= k.fp) {
          if (!cur.full) { cur.phase = 'black'; cur.t = 0; U.black.value = 1; }
          else { cur.phase = 'gap'; cur.t = 0; U.black.value = 1; }
        }
      } else if (cur.phase === 'gap') { U.black.value = 1; if (cur.t > 0.5) { cur.phase = 'tp'; cur.t = 0; document.getElementById('bloodFX').className = ''; k.tpStart(info); } }
      else if (cur.phase === 'tp') {
        k.tpU(cur.t, dt, info); gore.update(dt);
        if (cur.t > k.tp - 0.6) U.black.value = Math.min(1, (cur.t - (k.tp - 0.6)) / 0.6);
        if (cur.t >= k.tp) { cur.phase = 'black'; cur.t = 0; }
      } else if (cur.phase === 'black') { U.black.value = 1; if (cur.t > 0.6) { cur = null; return true; } }
      return false;
    },
    cleanup,
    get active() { return !!cur; },
    get phase() { return cur ? cur.phase : null; }, get t() { return cur ? cur.t : 0; },
  };
}
