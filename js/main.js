// 7:00 AM — the game loop: Owen, the morning, the loop, the menus, the dying.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { W, Y4, buildWorld, updateWorld, collide, groundY, zoneOf, indoors, clearLine, setDoor } from './world.js';
import { makePerson, setLayer } from './people.js';
import { createGore } from './gore.js';
import { createDay, mood, DEATHS, CLUES, remembered, SEC_PER_MIN } from './day.js';
import { createDeaths } from './deaths.js';
import { createIntro } from './intro.js';
import * as A from './audio.js';
import { voice } from './voice.js';
import { Input } from './input.js';
import { createGovernor } from '../perf.js';

const $ = (id) => document.getElementById(id);
const TEST = /[?&]test\b/.test(location.search);
const COARSE = matchMedia('(pointer: coarse)').matches && !matchMedia('(pointer: fine)').matches;
const load = (k) => { try { return JSON.parse(localStorage.getItem(k)) || null; } catch { return null; } };
const store = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } };
const SKEY = 'sevenam.settings', PKEY = 'sevenam.progress', SAVE = 'sevenam.save';
const settings = Object.assign({ vol: 0.8, voices: true, subs: true, sens: 1, invert: false, bright: 1, fov: 75, quality: COARSE ? 'low' : 'medium', gore: 'quick', pads: true, rumble: true }, load(SKEY) || {});
const progress = Object.assign({ endings: {}, deaths: {}, total: 0, loops: 0 }, load(PKEY) || {});
const freshSave = () => ({ loop: 0, clues: {}, deaths: {} });
let save = Object.assign(freshSave(), load(SAVE) || {});
const persist = () => { store(SAVE, save); store(PKEY, progress); syncSave(); };

// ---------- renderer ----------
const canvas = $('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', stencil: false });
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
renderer.info.autoReset = false; renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap; renderer.shadowMap.autoUpdate = true;
const scene = new THREE.Scene(); scene.fog = new THREE.FogExp2(0x9ac4ec, 0.006);
const camera = new THREE.PerspectiveCamera(settings.fov, innerWidth / innerHeight, 0.05, 170); camera.rotation.order = 'YXZ'; scene.add(camera);
const FX = {
  uniforms: { tDiffuse: { value: null }, time: { value: 0 }, fear: { value: 0 }, bright: { value: 1 }, flash: { value: 0 }, red: { value: 0 }, black: { value: 0 }, drain: { value: 0 }, him: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float time, fear, bright, flash, red, black, drain, him; varying vec2 vUv;
    float rnd(vec2 c){ return fract(sin(dot(c, vec2(12.9898, 78.233))) * 43758.5453); }
    void main(){
      vec2 uv = vUv, c = uv - 0.5;
      uv.x += him * 0.006 * sin(uv.y * 30.0 + time * 4.0);
      float ab = 0.0008 + fear * 0.006 + him * 0.01;
      vec3 col = vec3(texture2D(tDiffuse, uv + c * ab).r, texture2D(tDiffuse, uv).g, texture2D(tDiffuse, uv - c * ab).b);
      col = pow(max(col, 0.0), vec3(1.0 / bright));
      float l = dot(col, vec3(0.3, 0.59, 0.11));
      col = mix(col, vec3(l) * vec3(1.02, 0.98, 0.94), clamp(drain + fear * 0.25, 0.0, 0.9));
      col += (rnd(uv * vec2(1013.0, 717.0) + fract(time * 7.13)) - 0.5) * (0.025 + drain * 0.05 + fear * 0.05);
      float v = smoothstep(0.85 - fear * 0.25 - drain * 0.15, 0.2, length(c * vec2(1.0, 0.8)) * (1.0 + fear * 0.3));
      col *= mix(0.35, 1.0, v);
      col += vec3(1.0, 0.92, 0.8) * flash;
      col = mix(col, vec3(0.32, 0.0, 0.0), red);
      col *= 1.0 - black;
      gl_FragColor = vec4(col, 1.0);
    }`,
};
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera)); composer.addPass(new OutputPass());
const fxPass = new ShaderPass(FX); composer.addPass(fxPass);
const U = fxPass.uniforms;

// lights: the sun (the only shadow caster; its shadow box follows you), the sky, and 4 room lights that move to
// the 4 lamps nearest you
const hemi = new THREE.HemisphereLight(0xc8dcf0, 0x6a5a48, 1.0); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff0d8, 3); sun.castShadow = true; scene.add(sun, sun.target);
Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 90 }); sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.03;
const SUN_DIR = new THREE.Vector3(-0.35, 0.55, 1).normalize();
const pool = Array.from({ length: 4 }, () => { const l = new THREE.PointLight(0xffe8c8, 0, 9, 2); scene.add(l); return l; });
let basePR = 1;
const gov = createGovernor({ apply: (s) => { renderer.setPixelRatio(basePR * s); composer.setPixelRatio(basePR * s); } });
function applyQuality() {
  const q = settings.quality, dpr = devicePixelRatio || 1;
  basePR = q === 'low' ? Math.min(dpr, 1) * 0.75 : q === 'high' ? Math.min(dpr, 2) : Math.min(dpr, 1.25);
  renderer.setPixelRatio(basePR * gov.scale); composer.setPixelRatio(basePR * gov.scale);
  sun.castShadow = q !== 'low';
  const sm = q === 'high' ? 2048 : 1024;
  if (sun.shadow.mapSize.x !== sm) { sun.shadow.mapSize.set(sm, sm); sun.shadow.map?.dispose(); sun.shadow.map = null; }
  renderer.shadowMap.type = q === 'high' ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap; renderer.shadowMap.needsUpdate = true;
}
function resize() { renderer.setSize(innerWidth, innerHeight, false); composer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
addEventListener('resize', resize);
applyQuality(); resize();

buildWorld(scene);
const gore = createGore(scene, groundY);

// ---------- Owen ----------
const BED = { x: -5.4, z: -1.3, yaw: -Math.PI / 2 };
const P = { x: BED.x, y: Y4, z: BED.z, feet: Y4, yaw: BED.yaw, pitch: 0, eye: 1.62, crouch: false, crouching: false, stam: 1, zone: 'bed', bob: 0, stepT: 0, vy: 0, lookDir: new THREE.Vector3() };
Object.defineProperty(P, 'feet', { get() { return P.y; }, set(v) { P.y = v; } });
const mirrorRig = makePerson({ face: 'owen', shirt: 0x6a7078, pants: 0x2a3040 }); setLayer(mirrorRig, 1); scene.add(mirrorRig.root); mirrorRig.root.visible = false;
const input = new Input(canvas);
input.pads = settings.pads; input.padSens = settings.sens; input.touchSens = settings.sens; input.rumbleOn = settings.rumble;
voice.on = settings.voices; A.setVolume(settings.vol);
let mode = 'warn', clock = 0, fear = 0, spike = 0, shakeT = 0, focus = null, T = 0, moving = 0, deathKind = null, deathClock = 0;

// ---------- HUD ----------
const ui = {
  subT: 0, toastT: 0, hintT: 0, objT: 0,
  sub(text, dur = 4, kind = 'think') { if (!settings.subs && kind !== 'think') return; const e = $('sub'); e.innerHTML = text; e.className = 'on ' + kind; this.subT = dur; },
  toast(text) { const e = $('toast'); e.textContent = text; e.classList.add('on'); this.toastT = 2.4; },
  hint(text) { const e = $('hint'); e.textContent = text; e.classList.add('on'); this.hintT = 6; },
  skip(k) { const e = $('skip'); e.classList.toggle('on', k > 0 || mode === 'intro'); $('skipFill').style.width = (Math.min(1, k) * 100).toFixed(0) + '%'; },
  objective(show = true) {
    const o = day.objective(); const e = $('obj');
    $('objMain').textContent = o.main; $('objSub').innerHTML = o.sub.map((s) => `<div>${s}</div>`).join('');
    $('objClock').textContent = clockText() + ' AM' + (save.loop > 1 ? ` · Morning ${save.loop}` : '');
    if (show) { e.classList.add('on'); this.objT = 6; }
  },
  tick(dt) {
    if (this.subT > 0 && (this.subT -= dt) <= 0) $('sub').classList.remove('on');
    if (this.toastT > 0 && (this.toastT -= dt) <= 0) $('toast').classList.remove('on');
    if (this.hintT > 0 && (this.hintT -= dt) <= 0) $('hint').classList.remove('on');
    if (this.objT > 0 && (this.objT -= dt) <= 0) $('obj').classList.remove('on');
  },
};
const clockText = () => `7:${String(Math.min(59, Math.floor(clock))).padStart(2, '0')}`;
const keyName = (what) => {
  if (input.padMode) return { use: input.label(0), crouch: input.label(1), run: input.label(4), notes: input.label(3) }[what];
  if (input.touchMode) return { use: 'USE', crouch: 'CROUCH', run: 'RUN', notes: 'TIME' }[what];
  return { use: 'E', crouch: 'C', run: 'Shift', notes: 'Tab' }[what];
};

// ---------- the API the day uses ----------
const g = {
  scene, camera, P, A, voice, ui, gore, mirrorRig, W,
  get save() { return save; }, get clock() { return clock; }, get moving() { return moving; },
  F: {}, himNear: 0,
  persist() { persist(); },
  fearSpike(v) { spike = Math.max(spike, v); },
  shake(s) { shakeT = Math.max(shakeT, s); input.rumble(s, s, 300); },
  looking(x, y, z, dot = 0.85) { const d = new THREE.Vector3(x, y, z).sub(camera.position); const l = d.length(); if (l < 0.01) return true; return d.divideScalar(l).dot(P.lookDir) > dot; },
  die(kind, info) { die(kind, info); },
  ending(kind) { startEnding(kind); },
};
const day = createDay(g);
const deaths = createDeaths({ scene, camera, P, A, gore, U, W });
const intro = createIntro({ scene, camera, A, voice, ui, U });

// ---------- screens ----------
const SCREENS = ['warn', 'title', 'how', 'settings', 'pause', 'know', 'dead', 'ending', 'card'];
function show(id) { $(id).hidden = false; $(id).querySelector('button')?.focus({ preventScroll: true }); }
function only(id) { for (const s of SCREENS) $(s).hidden = s !== id; if (id) show(id); }
function lockSoon() { if (!TEST && !input.touchMode) setTimeout(() => input.lock(), 30); }
document.addEventListener('pointerlockchange', () => { if (!input.locked && mode === 'play' && !TEST && !input.touchMode) pause(true); });
canvas.addEventListener('click', () => { if (mode === 'play') input.lock(); });
function pause(on) {
  if (on && mode === 'play') { mode = 'paused'; only('pause'); voice.pause(); input.unlock(); }
  else if (!on && mode === 'paused') { mode = 'play'; only(null); voice.resume(); lockSoon(); }
}
function setHud(on) { $('hud').hidden = !on; $('touch').classList.toggle('on', on && input.touchMode); }

// ---------- a morning ----------
let wakeT = 0;
function beginLoop() {
  gore.clear(); deaths.cleanup();
  clock = 0; spike = 0; fear = 0; U.red.value = 0; U.flash.value = 0;
  Object.assign(P, { x: BED.x, z: BED.z, yaw: BED.yaw, pitch: 0.9, crouch: false, stam: 1, vy: 0 }); P.y = Y4;
  W.meshes.wallet.visible = true; W.meshes.keys.visible = true; W.meshes.valve.rotation.y = 0;
  W.meshes.elev0L.rotation.y = 0; W.meshes.elev0R.rotation.y = 0;
  day.start();
  applyMood();
  mode = 'card'; only('card'); setHud(false);
  $('cardTime').textContent = '7:00 AM';
  $('cardSub').textContent = save.loop === 1 ? 'Thursday' : ['Thursday', 'Thursday.', 'Thursday. Again.', 'Thursday', 'Thursday?', 'It is always Thursday.', 'Thursday', 'THURSDAY'][Math.min(7, save.loop - 1)];
  A.initAudio();
  wakeT = 0; U.black.value = 1;
  setTimeout(() => { if (mode !== 'card') return; only(null); mode = 'wake'; setHud(true); lockSoon(); }, TEST ? 300 : 2600);
}
function applyMood() {
  const m = mood(save.loop);
  scene.fog.color.set(m.sky); scene.fog.density = m.fog; W.mat.sky.color.set(m.sky);
  sun.intensity = m.sun; sun.color.set(m.sunCol); hemi.intensity = m.hemi; hemi.color.set(m.sky).lerp(new THREE.Color(0xffffff), 0.5);
  U.drain.value = m.drain;
  // the lamps get dimmer and redder too
  for (const f of W.fixtures) { f.m.material.emissiveIntensity = 1.2 - m.drain; }
  W.mat.lamp.emissive.set(0xfff0d0).lerp(new THREE.Color(0xff4020), m.drain * 0.6);
  birds = m.birds;
}
let birds = 1;
function nightMood() { scene.fog.color.set(0x020306); scene.fog.density = 0.03; W.mat.sky.color.set(0x020306); sun.intensity = 0; hemi.intensity = 0.06; U.drain.value = 0.3; }
function newGame() {
  save = freshSave(); store(SAVE, save);
  if (TEST || load('sevenam.skipIntro')) { save.loop = 1; persist(); beginLoop(); return; }
  mode = 'intro'; only(null); setHud(false); nightMood(); A.initAudio(); intro.start(); ui.skip(0);
}
function continueGame() { if (save.loop < 1) { newGame(); return; } beginLoop(); }
function nextLoop() { save.loop++; progress.loops = Math.max(progress.loops, save.loop); persist(); beginLoop(); }

// ---------- dying ----------
function die(kind, info = {}) {
  if (mode !== 'play') return;
  mode = 'dying'; deathKind = kind; deathClock = clock;
  const first = !save.deaths[kind];
  save.deaths[kind] = (save.deaths[kind] || 0) + 1; progress.deaths[kind] = (progress.deaths[kind] || 0) + 1; progress.total++;
  persist(); day.stopSounds(); voice.cancel(); input.rumble(1, 1, 700);
  setHud(false); $('dead').dataset.first = first ? '1' : '';
  deaths.start(kind, info, settings.gore === 'full');
}
function showDead() {
  const d = DEATHS[deathKind] || DEATHS.him;
  mode = 'dead'; input.unlock();
  $('deadTitle').textContent = d.title; $('deadTime').textContent = `${clockText()} AM`;
  $('deadLine').textContent = d.line;
  $('deadLearn').textContent = $('dead').dataset.first ? d.learn : '';
  $('deadCount').textContent = `Died ${progress.total} time${progress.total === 1 ? '' : 's'}. ${Object.keys(save.deaths).length} of ${Object.keys(DEATHS).length} ways.`;
  only('dead');
  A.alarm(1, null);
}

// ---------- endings ----------
const ENDINGS = {
  bus: { title: 'THE 7:40', lines: ['You sit at the back. The bus pulls away from Callow Street, and nothing falls on you, and nothing hits you.', 'Nobody on the bus has a face. Not the driver. Not the woman across the aisle.', 'In the black window you see your reflection. Smooth skin, from your hairline to your chin.', 'The sign at the front changes to ROUTE 9.', 'Somewhere a man in a grey coat wakes up in your bed, at 7:00 AM, and starts fixing things.'], note: 'You made it. You never asked who he was.' },
  passenger: { title: 'THE PASSENGER', lines: ['You know his name. You know what you did. You get on the bus anyway.', 'The driver looks at you in his mirror. He has a kind, tired face: forty-one, a night nurse, going home.', '"Long night?" says Martin Vey.', 'The doors close. The bus doesn\'t stop at your stop, or the next one.', 'It never stops again.'], note: 'You knew. You ran anyway.' },
  name: { title: 'HIS NAME', lines: ['"Martin," you say. "Martin Vey."', 'The skin of his face moves, like something under water, and then there is a face: tired, kind, forty-one, frightened. It was always frightened.', 'You tell him you\'re sorry. It isn\'t enough. You say it anyway.', 'At 7:41 AM, Owen Hale walked up to the police car on Callow Street and told the officer what he had done on Route 9.', 'The next morning the alarm went off at 7:00 in a cell on the second floor of the county jail. He let it ring.', 'It was Friday.'], note: 'The true ending.' },
};
let endKind = null, endT = 0;
function startEnding(kind) { if (mode !== 'play') return; endKind = kind; mode = 'endcut'; endT = 0; setHud(false); day.stopSounds(); voice.cancel(); if (kind === 'name') A.presence(0.3, 4); }
function showEnding() {
  const e = ENDINGS[endKind]; mode = 'ending';
  progress.endings[endKind] = 1; progress.total = progress.total || 0;
  const loops = save.loop; save = freshSave(); persist();
  $('endTitle').textContent = e.title;
  $('endLines').innerHTML = e.lines.map((l, i) => `<p style="animation-delay:${1 + i * 2.8}s">${l}</p>`).join('');
  $('endFoot').style.animationDelay = (2 + e.lines.length * 2.8) + 's';
  $('endWhich').textContent = `${e.note} · ${loops} morning${loops === 1 ? '' : 's'} · endings found: ${Object.keys(progress.endings).length} of 3`;
  only('ending'); input.unlock();
}

// ---------- interaction ----------
function promptFor(it) {
  if (it.door) { const d = it.door; return d.locked ? d.name : d.open ? 'Close' : 'Open ' + (d.label || d.name.toLowerCase()); }
  const s = day.I[it.id]; return s ? s.p() : null;
}
function findFocus() {
  const eye = camera.position, dir = P.lookDir;
  let best = null, bs = -1;
  for (const it of W.inter) {
    const dx = it.x - eye.x, dy = it.y - eye.y, dz = it.z - eye.z;
    if (Math.abs(dy) > 2.2) continue;
    const d = Math.hypot(dx, dy, dz);
    if (d > it.r) continue;
    const dot = (dx * dir.x + dy * dir.y + dz * dir.z) / d;
    if (dot < (d < 0.9 ? 0.55 : 0.82)) continue;
    const label = promptFor(it); if (!label) continue;
    const hd = Math.hypot(dx, dz) || 1;
    if (!it.door && hd > 0.5 && !clearLine(P.x, P.z, it.x - (dx / hd) * 0.45, it.z - (dz / hd) * 0.45, P.y + 1.2)) continue;
    const s = dot - d * 0.08; if (s > bs) { bs = s; best = { it, label }; }
  }
  return best;
}
function use(it) { if (it.door) day.door(it.door); else day.I[it.id]?.use(); ui.objective(false); }

// ---------- playing ----------
const SURF = { bed: 'wood', entry: 'wood', living: 'wood', bath: 'tile', hall4: 'tile', stairs: 'concrete', lobby: 'tile', laundry: 'concrete', alley: 'concrete', street: 'concrete', road: 'concrete', far: 'concrete', shop: 'tile', elevator: 'tile' };
let lastObj = '';
function updatePlay(dt, t) {
  const K = (...c) => input.down(...c), H = (...c) => input.hit(...c), pad = input.pad;
  if (H('Escape', 'KeyP') || pad?.pause) { pause(true); return; }
  const sens = 0.0021 * settings.sens;
  P.yaw -= input.dx * sens; P.pitch -= input.dy * sens * (settings.invert ? -1 : 1);
  P.pitch = Math.max(-1.45, Math.min(1.45, P.pitch));
  if (H('Tab', 'KeyJ') || pad?.notes) ui.objective();
  if (H('KeyC') || pad?.crouch) P.crouch = !P.crouch;
  const crouch = P.crouch || K('ControlLeft', 'ControlRight');
  let fx = 0, sx = 0;
  if (K('KeyW', 'ArrowUp')) fx += 1; if (K('KeyS', 'ArrowDown')) fx -= 1; if (K('KeyD', 'ArrowRight')) sx += 1; if (K('KeyA', 'ArrowLeft')) sx -= 1;
  if (pad) { fx += pad.mz; sx += pad.mx; }
  const l = Math.hypot(fx, sx); if (l > 1) { fx /= l; sx /= l; }
  const run = !crouch && (K('ShiftLeft', 'ShiftRight') || pad?.run) && P.stam > 0.05 && fx > 0.3;
  const spd = crouch ? 1.1 : run ? 4.0 : 2.15;
  const fw = [-Math.sin(P.yaw), -Math.cos(P.yaw)], rt = [Math.cos(P.yaw), -Math.sin(P.yaw)];
  const mx = (fw[0] * fx + rt[0] * sx) * spd * dt, mz = (fw[1] * fx + rt[1] * sx) * spd * dt;
  const [nx, nz] = collide(P.x, P.z, mx, mz, 0.28, P.y, crouch ? 1.1 : 1.75);
  moving = Math.hypot(nx - P.x, nz - P.z) / dt;
  P.x = nx; P.z = nz;
  // stairs and kerbs: follow the ground up, fall down it
  const gy = groundY(P.x, P.z, P.y);
  if (gy > P.y - 0.02) { P.y += (gy - P.y) * Math.min(1, dt * 16); P.vy = 0; }
  else if (gy > P.y - 0.45 && P.vy === 0) { P.y += (gy - P.y) * Math.min(1, dt * 16); }
  else { P.vy -= 18 * dt; P.y = Math.max(gy, P.y + P.vy * dt); if (P.y === gy) P.vy = 0; }
  P.stam = run && moving > 1 ? Math.max(0, P.stam - dt / 6) : Math.min(1, P.stam + dt / (P.stam < 0.1 ? 8 : 5));
  P.eye += ((crouch ? 1.0 : 1.62) - P.eye) * Math.min(1, dt * 10);
  P.crouching = crouch;
  P.zone = zoneOf(P.x, P.y, P.z);
  if (moving > 0.3) {
    P.bob += dt * moving * 2.6;
    P.stepT += (moving * dt) / (run ? 0.95 : crouch ? 0.55 : 0.72);
    if (P.stepT >= 1) { P.stepT = 0; A.step(new THREE.Vector3(P.x, P.y, P.z), SURF[P.zone] || 'wood', run ? 0.32 : crouch ? 0.07 : 0.16); }
  } else P.bob *= 0.9;
  // interaction
  focus = findFocus();
  $('prompt').innerHTML = focus ? `<b>${keyName('use')}</b> ${focus.label}` : '';
  if (focus && (H('KeyE') || input.lmbHit || pad?.use)) use(focus.it);
  // time passes
  clock += dt / SEC_PER_MIN;
  // fear: him, the dark, the moment
  spike = Math.max(0, spike - dt * 0.3);
  const ft = Math.max(spike, g.himNear * 0.8, mood(save.loop).drain * 0.3);
  fear += (ft - fear) * Math.min(1, dt * (ft > fear ? 2.5 : 0.4)); g.himNear = 0;
  A.heartbeat(dt, 64 + fear * 80, Math.max(0, fear - 0.2) * 0.5);
  A.breath(dt, 0.25 + (1 - P.stam) * 0.6 + fear * 0.3, 0.004 + (1 - P.stam) * 0.05 + fear * 0.02);
  day.update(dt, t);
  if (mode !== 'play') return;
  const o = day.objective(); if (o.main !== lastObj) { lastObj = o.main; ui.objective(); }
  placeCamera(dt);
  $('xhair').classList.toggle('on', !!focus);
}
function placeCamera(dt) {
  const k = Math.min(1, moving / 2), bob = Math.sin(P.bob) * 0.035 * k, sway = Math.cos(P.bob * 0.5) * 0.02 * k;
  camera.position.set(P.x + Math.cos(P.yaw) * sway, P.y + P.eye + bob, P.z - Math.sin(P.yaw) * sway);
  let sh = fear > 0.65 ? (fear - 0.65) * 0.012 : 0;
  if (shakeT > 0) { shakeT -= dt; sh += shakeT * 0.05; }
  camera.rotation.set(P.pitch + (Math.random() - 0.5) * sh, P.yaw + (Math.random() - 0.5) * sh, 0);
  camera.updateMatrixWorld(); camera.getWorldDirection(P.lookDir);
}
// waking up: on your back, the ceiling, the alarm. You sit up.
function updateWake(dt, t) {
  wakeT += dt;
  const k = Math.min(1, wakeT / 2.4), e = k * k * (3 - 2 * k);
  U.black.value = Math.max(0, 1 - wakeT * 0.8);
  camera.position.set(-6.7 + (BED.x + 6.7) * e, Y4 + 0.8 + (1.62 - 0.8) * e, -1.25 + (BED.z + 1.25) * e);
  camera.rotation.set(1.35 * (1 - e), BED.yaw * e + (-Math.PI / 2) * (1 - e) * 0, Math.sin(wakeT * 2) * 0.03 * (1 - e));
  camera.updateMatrixWorld(); camera.getWorldDirection(P.lookDir);
  day.update(dt, t);
  if (wakeT >= 2.4) {
    mode = 'play'; P.pitch = 0; P.yaw = BED.yaw; U.black.value = 0; ui.objective();
    if (save.loop === 1) ui.hint(input.padMode ? 'Left stick move · right stick look · A use' : input.touchMode ? 'Left thumb move · right thumb look' : 'WASD move · mouse look · E use · Shift run · C crouch · Tab objective');
  }
}

// ---------- lights each frame ----------
let poolT = 0;
const _sv = new THREE.Vector3();
function updateLights(dt) {
  // the sun's shadow box follows the camera
  const c = camera.position;
  sun.target.position.set(Math.round(c.x), Math.round(c.y), Math.round(c.z)); sun.position.copy(sun.target.position).addScaledVector(SUN_DIR, 45);
  sun.target.updateMatrixWorld();
  if ((poolT -= dt) <= 0) {
    poolT = 0.2;
    const near = W.fixtures.map((f) => ({ f, d: (f.x - c.x) ** 2 + ((f.y - c.y) * 3) ** 2 + (f.z - c.z) ** 2 })).sort((a, b) => a.d - b.d).slice(0, pool.length);
    near.forEach(({ f }, i) => { const l = pool[i]; l.position.set(f.x, f.y, f.z); l.color.set(f.color); l.distance = f.range; l.userData.base = f.power * (1 - mood(save.loop).drain * 0.6); l.userData.room = f.room; });
  }
  const late = save.loop >= 6, flick = late || g.himNear > 0.3;
  for (const l of pool) l.intensity = (l.userData.base || 0) * (flick && Math.random() < (late ? 0.04 : 0.15) ? 0.15 : 1);
}

// ---------- the title screen: the living room window, the street, the window across it ----------
function updateTitle(dt, t) {
  camera.position.set(3.2 + Math.sin(t * 0.1) * 0.1, Y4 + 1.6, -1.4); camera.rotation.set(0.02 + Math.sin(t * 0.13) * 0.01, Math.PI + 0.12 + Math.sin(t * 0.07) * 0.03, 0);
  camera.updateMatrixWorld(); camera.getWorldDirection(P.lookDir);
  day.him.root.visible = true; day.him.root.position.set(2.1, 12.45, 16.0); day.him.root.rotation.y = Math.PI;
  U.black.value = Math.max(0, U.black.value - dt);
}

// ---------- the loop ----------
let last = performance.now(), fadeIn = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const raw = Math.max(0, Math.min(0.1, (now - last) / 1000)); last = now;
  const dt = Math.min(raw, 0.05); T += dt;
  gov.tick(raw);
  input.pollPad(raw);
  if (mode === 'play') updatePlay(dt, T);
  else if (mode === 'wake') updateWake(dt, T);
  else if (mode === 'title' || mode === 'warn' || mode === 'how' || mode === 'settings') updateTitle(dt, T);
  else if (mode === 'intro') { const skip = input.down('KeyE', 'Space', 'Enter', 'Escape') || !!input.pad?.use || input.lmb; if (intro.update(dt, skip)) { if (introReplay) { introReplay = false; toTitle(); } else { save.loop = 1; persist(); beginLoop(); } } }
  else if (mode === 'dying') { if (deaths.update(dt)) showDead(); }
  else if (mode === 'endcut') { endT += dt; U.black.value = Math.min(1, endT / 2); if (endKind === 'name') { day.him.root.visible = true; } if (endT > 2.4) showEnding(); }
  else if (mode === 'card' || mode === 'ending' || mode === 'dead') U.black.value = 1;
  if (mode === 'play' || mode === 'wake' || mode === 'dying') gore.update(dt);
  menuPad();
  updateWorld(dt);
  updateLights(dt);
  ui.tick(dt);
  U.time.value = T; U.fear.value = mode === 'play' ? fear : 0.05; U.bright.value = settings.bright; U.him.value = mode === 'play' ? Math.max(0, fear - 0.5) : 0;
  if (mode !== 'dying' && mode !== 'endcut') { U.red.value = Math.max(0, U.red.value - dt); U.flash.value = Math.max(0, U.flash.value - dt * 2); }
  A.setListener(camera.position, P.lookDir);
  const out = mode === 'intro' ? 1 : indoors(P.zone) ? 0 : 1;
  A.ambience(dt, { outdoors: out, birds: mode === 'intro' ? 0 : birds, fear, rain: mode === 'intro' ? 1 : 0, traffic: mode === 'intro' ? 0 : 1 });
  renderer.info.reset();
  composer.render();
  input.endFrame();
}

// ---------- menus ----------
function menuPad() {
  const p = input.pad; if (!p || mode === 'play' || mode === 'dying' || mode === 'intro' || mode === 'wake') return;
  const scr = SCREENS.map($).find((e) => !e.hidden); if (!scr) return;
  const items = [...scr.querySelectorAll('button:not([disabled]), input, select')].filter((e) => e.offsetParent);
  if (!items.length) return;
  let i = items.indexOf(document.activeElement);
  if (p.up) i = (i <= 0 ? items.length : i) - 1; if (p.downB) i = (i + 1) % items.length;
  if (p.up || p.downB) items[Math.max(0, i)].focus();
  const f = document.activeElement;
  if (f && f.type === 'range' && (p.mx > 0.6 || p.mx < -0.6)) { f.value = +f.value + Math.sign(p.mx) * (+f.step || 1); f.dispatchEvent(new Event('input')); }
  if (f && f.tagName === 'SELECT' && p.a) { f.selectedIndex = (f.selectedIndex + 1) % f.options.length; f.dispatchEvent(new Event('change')); return; }
  if (p.a && f && items.includes(f)) { if (f.type === 'checkbox') { f.checked = !f.checked; f.dispatchEvent(new Event('change')); } else f.click(); }
  if (p.b) { const back = scr.querySelector('[data-back]') || (mode === 'paused' && $('btnResume')); back?.click(); }
  if (p.pause && mode === 'paused') pause(false);
}
addEventListener('keydown', (e) => {
  if (mode === 'paused' && e.code === 'Escape' && !$('pause').hidden) pause(false);
  else if (mode === 'dead' && (e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyE')) { e.preventDefault(); $('btnWake').click(); }
  else if (e.code === 'Escape') { const scr = SCREENS.map($).find((s) => !s.hidden); scr?.querySelector('[data-back]')?.click(); }
});
function toTitle() { mode = 'title'; setHud(false); day.stopSounds(); voice.cancel(); deaths.cleanup(); gore.clear(); applyMood(); U.black.value = 1; only('title'); refreshTitle(); }
$('warnOk').onclick = () => { store('sevenam.warned', 1); A.initAudio(); mode = 'title'; only('title'); refreshTitle(); };
$('btnNew').onclick = () => { if (save.loop > 0 && !confirmNew()) return; newGame(); };
const confirmNew = () => { const b = $('btnNew'); if (b.dataset.sure) { delete b.dataset.sure; return true; } b.dataset.sure = 1; b.textContent = 'Start over? (press again)'; setTimeout(() => { delete b.dataset.sure; b.textContent = 'New morning'; }, 3000); return false; };
$('btnContinue').onclick = () => continueGame();
$('btnHow').onclick = () => only('how');
$('btnSettings').onclick = () => { settingsFrom = 'title'; only('settings'); };
$('btnResume').onclick = () => pause(false);
$('btnKnow').onclick = () => { knowList(); only('know'); };
$('btnPauseSettings').onclick = () => { settingsFrom = 'pause'; only('settings'); };
$('btnQuit').onclick = () => toTitle();
$('btnWake').onclick = () => { if (mode === 'dead') nextLoop(); };
$('btnDeadTitle').onclick = () => { save.loop++; persist(); toTitle(); };
$('btnEndTitle').onclick = () => toTitle();
$('btnReplayIntro').onclick = () => { store('sevenam.skipIntro', 0); mode = 'intro'; only(null); setHud(false); nightMood(); A.initAudio(); intro.start(); introReplay = true; };
let settingsFrom = 'title', introReplay = false;
document.querySelectorAll('[data-back]').forEach((b) => (b.onclick = () => {
  const scr = b.closest('.screen').id;
  if (scr === 'know' || (scr === 'settings' && settingsFrom === 'pause')) { only('pause'); return; }
  only('title'); refreshTitle();
}));
function knowList() {
  const box = $('knowList'); box.innerHTML = '';
  const add = (h, items) => { if (!items.length) return; const e = document.createElement('div'); e.className = 'kgroup'; e.innerHTML = `<h3>${h}</h3>` + items.map((s) => `<p>${s}</p>`).join(''); box.appendChild(e); };
  add('How you died', Object.keys(save.deaths).map((k) => `<b>${DEATHS[k].title}.</b> ${DEATHS[k].learn}`));
  add('What you remember', Object.keys(save.clues).map((k) => CLUES[k]));
  if (!box.children.length) box.innerHTML = '<p class="small">Nothing yet. It\'s just a Thursday.</p>';
  $('knowCount').textContent = `Morning ${save.loop} · ${Object.keys(save.clues).length} / 4 remembered`;
}
function refreshTitle() {
  $('btnContinue').hidden = save.loop < 1;
  $('btnContinue').textContent = save.loop >= 1 ? `Wake up (morning ${save.loop})` : 'Continue';
  $('btnNew').textContent = 'New morning';
  $('btnReplayIntro').hidden = !progress.loops;
  const e = Object.keys(progress.endings).map((k) => ENDINGS[k].title);
  $('titleProg').textContent = e.length ? `Endings: ${e.join(' · ')}` : progress.total ? `Died ${progress.total} times` : '';
}
function bindSetting(id, keyN, fmt, apply) {
  const el = $(id), out = el.parentElement.querySelector('output');
  if (el.type === 'checkbox') el.checked = !!settings[keyN]; else el.value = settings[keyN];
  const upd = () => { settings[keyN] = el.type === 'checkbox' ? el.checked : el.tagName === 'SELECT' ? el.value : +el.value; if (out) out.textContent = fmt ? fmt(settings[keyN]) : settings[keyN]; apply?.(settings[keyN]); store(SKEY, settings); };
  el.addEventListener('input', upd); el.addEventListener('change', upd); if (out) out.textContent = fmt ? fmt(settings[keyN]) : settings[keyN];
}
bindSetting('sVol', 'vol', (v) => Math.round(v * 100) + '%', (v) => A.setVolume(v));
bindSetting('sSens', 'sens', (v) => v.toFixed(2), (v) => { input.padSens = v; input.touchSens = v; });
bindSetting('sBright', 'bright', (v) => Math.round(v * 100) + '%');
bindSetting('sFov', 'fov', (v) => v + '°', (v) => { camera.fov = v; camera.updateProjectionMatrix(); });
bindSetting('sQuality', 'quality', null, () => { gov.reset(); applyQuality(); });
bindSetting('sGore', 'gore');
bindSetting('sVoices', 'voices', null, (v) => { voice.on = v; });
bindSetting('sSubs', 'subs');
bindSetting('sInvert', 'invert');
bindSetting('sPads', 'pads', null, (v) => { input.pads = v; });
bindSetting('sRumble', 'rumble', null, (v) => { input.rumbleOn = v; });
input.onKind = (m) => { document.body.dataset.input = m; $('touch').classList.toggle('on', m === 'touch' && mode === 'play'); };
if (COARSE) input.setMode('touch');
input.bindTouch($('touch'));
document.body.dataset.input = input.padMode ? 'pad' : input.touchMode ? 'touch' : 'keys';

// ---------- sync + achievements ----------
function syncSave() { try { window.GameSync?.syncNow?.(); } catch { /* fine */ } }
if (window.GameSync) {
  const pr = (gg) => gg(PKEY) || {};
  const nd = (gg) => Object.keys(pr(gg).deaths || {}).length;
  GameSync.init({ game: 'sevenam', idle: () => mode === 'title' || mode === 'warn', keys: [{ match: PKEY, mode: 'max' }], ach: [
    { id: 'first', name: 'Thursday', desc: 'Die for the first time', test: (gg) => (pr(gg).total || 0) > 0 },
    { id: 'five', name: 'Again', desc: 'Die five different ways', test: (gg) => nd(gg) >= 5 },
    { id: 'all', name: 'Every way', desc: 'See all eight deaths', test: (gg) => nd(gg) >= 8 },
    { id: 'bus', name: 'The 7:40', desc: 'Catch the bus', test: (gg) => !!(pr(gg).endings || {}).bus },
    { id: 'passenger', name: 'The passenger', desc: 'Catch the bus, knowing', test: (gg) => !!(pr(gg).endings || {}).passenger },
    { id: 'name', name: 'His name', desc: 'Say it', test: (gg) => !!(pr(gg).endings || {}).name },
  ] });
  $('syncBtn').onclick = () => GameSync.open();
} else $('syncBtn').hidden = true;

// ---------- boot ----------
document.body.dataset.ready = '1';
if (load('sevenam.warned')) { mode = 'title'; only('title'); refreshTitle(); } else { mode = 'warn'; only('warn'); }
applyMood(); setHud(false); U.black.value = 1;
document.addEventListener('pointerdown', () => A.initAudio(), { once: true });
requestAnimationFrame(frame);

if (TEST) window.__s = {
  P, W, day, g, camera, U, renderer, scene, progress, settings, deaths, gore, intro,
  get save() { return save; }, get mode() { return mode; }, set mode(v) { mode = v; },
  get clock() { return clock; }, set clock(v) { clock = v; },
  newGame, continueGame, nextLoop, beginLoop, setQuality(q) { settings.quality = q; applyQuality(); }, setGore(v) { settings.gore = v; },
  tp(x, y, z, yaw = P.yaw, pitch = 0) { P.x = x; P.y = y; P.z = z; P.yaw = yaw; P.pitch = pitch; P.vy = 0; P.zone = zoneOf(x, y, z); },
  use(id) { const it = W.inter.find((i) => i.id === id); if (it) use(it); return !!it; },
  door(id, open = true) { setDoor(W.doors.get(id), open); },
  focus() { return focus ? focus.label : null; },
  key(code, down = true) { if (down) { input.keys.add(code); input.pressed.add(code); } else input.keys.delete(code); },
  playIntro() { mode = 'intro'; only(null); nightMood(); intro.start(); },
  stats() { return { calls: renderer.info.render.calls, tris: renderer.info.render.triangles, geos: renderer.info.memory.geometries, tex: renderer.info.memory.textures, merge: W.stats, children: scene.children.length }; },
};
void introReplay;
