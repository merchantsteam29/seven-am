// All the sound is made live with Web Audio: the alarm, the gas, the street, engines, the elevator, gunshots,
// what bodies sound like, and the long low tone when he is near. No sound files.
let ctx = null, master, sfx, amb, verb, verbIn, noiseBuf, listenerReady = false;
export const audio = { vol: 0.8, get ctx() { return ctx; } };

export function initAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
  ctx = new AC();
  master = ctx.createGain(); master.gain.value = audio.vol;
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
  master.connect(comp).connect(ctx.destination);
  sfx = ctx.createGain(); sfx.connect(master);
  amb = ctx.createGain(); amb.gain.value = 0.9; amb.connect(master);
  // a small dark room reverb
  verb = ctx.createConvolver(); const len = ctx.sampleRate * 1.6, ir = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
  verb.buffer = ir; verbIn = ctx.createGain(); verbIn.gain.value = 0.35; verbIn.connect(verb); const vo = ctx.createGain(); vo.gain.value = 0.5; verb.connect(vo).connect(master);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const nd = noiseBuf.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  startAmbience();
}
export function setVolume(v) { audio.vol = v; if (master) master.gain.setTargetAtTime(v, ctx.currentTime, 0.05); }

const now = () => ctx.currentTime;
function noise(loop = false) { const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = loop; if (!loop) s.loopStart = 0; return s; }
function env(g, t, a, peak, d, end = 0.0001) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(end, t + a + d); }
function filt(type, f, q = 1) { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; }

// ---------- 3D: sounds placed in the house ----------
export function setListener(pos, fwd) {
  if (!ctx) return; const L = ctx.listener;
  if (L.positionX) { L.positionX.value = pos.x; L.positionY.value = pos.y; L.positionZ.value = pos.z; L.forwardX.value = fwd.x; L.forwardY.value = fwd.y; L.forwardZ.value = fwd.z; L.upX.value = 0; L.upY.value = 1; L.upZ.value = 0; }
  else { L.setPosition(pos.x, pos.y, pos.z); L.setOrientation(fwd.x, fwd.y, fwd.z, 0, 1, 0); }
  listenerReady = true;
}
// muffled = behind walls / on another floor (0 clear .. 1 very muffled)
function out(pos, muffled = 0, wet = 0.4) {
  const g = ctx.createGain();
  let node = g;
  if (muffled > 0) { const lp = filt('lowpass', 5000 * Math.pow(0.12, muffled)); g.connect(lp); node = lp; }
  if (pos && listenerReady) {
    const p = ctx.createPanner(); p.panningModel = 'HRTF'; p.distanceModel = 'inverse'; p.refDistance = 1.2; p.rolloffFactor = 1.3; p.maxDistance = 40;
    if (p.positionX) { p.positionX.value = pos.x; p.positionY.value = pos.y; p.positionZ.value = pos.z; } else p.setPosition(pos.x, pos.y, pos.z);
    node.connect(p); p.connect(sfx); const w = ctx.createGain(); w.gain.value = wet; p.connect(w).connect(verbIn);
  } else { node.connect(sfx); const w = ctx.createGain(); w.gain.value = wet; node.connect(w).connect(verbIn); }
  return g;
}
export const occl = { fn: () => 0 }; // set by the game: how muffled a position is from where you are

// ---------- one-shots ----------
export function step(pos, surface = 'wood', vol = 0.3, muffled = 0) {
  if (!ctx) return; const t = now();
  const s = noise(), g = out(pos, muffled, 0.25);
  const f = { wood: [500, 1.2], carpet: [260, 0.8], tile: [1600, 2], concrete: [900, 1.5], dirt: [300, 0.7] }[surface] || [500, 1];
  const bp = filt('bandpass', f[0] * (0.85 + Math.random() * 0.3), f[1]);
  s.connect(bp).connect(g); env(g, t, 0.005, vol, 0.09); s.start(t, Math.random()); s.stop(t + 0.15);
  if (surface === 'wood' && Math.random() < 0.18) creak(pos, vol * 0.5, muffled, 0.25);
}
export function creak(pos, vol = 0.25, muffled = 0, len = 0.5) {
  if (!ctx) return; const t = now();
  const o = ctx.createOscillator(); o.type = 'sawtooth';
  const base = 90 + Math.random() * 120; o.frequency.setValueAtTime(base, t); o.frequency.linearRampToValueAtTime(base * (0.7 + Math.random() * 0.8), t + len);
  const am = ctx.createOscillator(); am.frequency.value = 18 + Math.random() * 30; const amg = ctx.createGain(); amg.gain.value = 0.5; am.connect(amg);
  const g = out(pos, muffled, 0.6), bp = filt('bandpass', 900 + Math.random() * 900, 6), vg = ctx.createGain(); vg.gain.value = 0.5; amg.connect(vg.gain);
  o.connect(bp).connect(vg).connect(g); env(g, t, 0.05, vol, len); o.start(t); am.start(t); o.stop(t + len + 0.1); am.stop(t + len + 0.1);
}
export function doorSound(pos, open = true, slam = false, muffled = 0) {
  if (!ctx) return;
  if (slam) { thud(pos, 0.9, muffled, 70); creak(pos, 0.3, muffled, 0.2); return; }
  creak(pos, 0.22, muffled, open ? 0.7 + Math.random() * 0.5 : 0.35);
  if (!open) setTimeout(() => thud(pos, 0.35, muffled, 110), 330);
}
export function thud(pos, vol = 0.5, muffled = 0, freq = 90) {
  if (!ctx) return; const t = now();
  const o = ctx.createOscillator(); o.frequency.setValueAtTime(freq * 1.6, t); o.frequency.exponentialRampToValueAtTime(freq * 0.6, t + 0.2);
  const g = out(pos, muffled, 0.6); o.connect(g); env(g, t, 0.004, vol, 0.3); o.start(t); o.stop(t + 0.4);
  const n = noise(), ng = out(pos, muffled, 0.5), lp = filt('lowpass', 900); n.connect(lp).connect(ng); env(ng, t, 0.002, vol * 0.5, 0.12); n.start(t); n.stop(t + 0.2);
}
export function knock(pos, n = 3, muffled = 0.2, vol = 0.6) { for (let i = 0; i < n; i++) setTimeout(() => thud(pos, vol, muffled, 140 + Math.random() * 20), i * (260 + Math.random() * 80)); }
export function click(vol = 0.25) {
  if (!ctx) return; const t = now(); const n = noise(), g = out(null, 0, 0.05), hp = filt('highpass', 2500);
  n.connect(hp).connect(g); env(g, t, 0.001, vol, 0.03); n.start(t, Math.random()); n.stop(t + 0.05);
}
export function pickup() {
  if (!ctx) return; const t = now();
  const n = noise(), g = out(null, 0, 0.1), bp = filt('bandpass', 3000, 2); n.connect(bp).connect(g); env(g, t, 0.01, 0.15, 0.15); n.start(t, Math.random()); n.stop(t + 0.2);
}
export function paper() {
  if (!ctx) return; const t = now();
  for (let i = 0; i < 4; i++) { const n = noise(), g = out(null, 0, 0.1), bp = filt('bandpass', 2500 + Math.random() * 2000, 1); n.connect(bp).connect(g); env(g, t + i * 0.05, 0.01, 0.12, 0.06); n.start(t + i * 0.05, Math.random()); n.stop(t + i * 0.05 + 0.1); }
}
// a sharp stinger for scares: a stab of dissonant strings and a hit
export function sting(vol = 0.5) {
  if (!ctx) return; const t = now();
  for (const fq of [233, 247, 349, 370, 494]) {
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(fq, t); o.frequency.linearRampToValueAtTime(fq * 0.97, t + 1.4);
    const g = out(null, 0, 0.6), lp = filt('lowpass', 2800); o.connect(lp).connect(g); env(g, t, 0.01, vol * 0.13, 1.6); o.start(t); o.stop(t + 1.8);
  }
  thud(null, vol, 0, 55);
}
export function thunder(dist = 0.5) {
  if (!ctx) return; const t = now() + dist * 1.2;
  const n = noise(), g = out(null, 0, 0.8), lp = filt('lowpass', 260);
  n.connect(lp).connect(g); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5 - dist * 0.25, t + 0.08); g.gain.exponentialRampToValueAtTime(0.25, t + 0.6); g.gain.exponentialRampToValueAtTime(0.0001, t + 4);
  n.start(t); n.stop(t + 4.2);
}
// ---------- loops you can start and stop ----------
// static from the baby monitor / the TV / the phone line
export function staticLoop(pos, vol = 0.12) {
  if (!ctx) return { stop() {}, set() {} };
  const n = noise(true), bp = filt('bandpass', 2200, 0.7), g = out(pos, 0, 0.3); g.gain.value = 0;
  const crackle = ctx.createGain(); crackle.gain.value = 1;
  n.connect(bp).connect(crackle).connect(g); n.start();
  g.gain.setTargetAtTime(vol, now(), 0.05);
  let alive = true; const tick = () => { if (!alive) return; crackle.gain.setValueAtTime(0.4 + Math.random() * 0.8, now()); setTimeout(tick, 30 + Math.random() * 90); }; tick();
  return { stop() { alive = false; g.gain.setTargetAtTime(0.0001, now(), 0.05); setTimeout(() => n.stop(), 400); }, set(v) { g.gain.setTargetAtTime(v, now(), 0.1); } };
}
export function phoneRing(pos) {
  if (!ctx) return { stop() {} };
  const g = out(pos, 0, 0.5); g.gain.value = 0;
  const a = ctx.createOscillator(), b = ctx.createOscillator(); a.frequency.value = 440; b.frequency.value = 480;
  const mix = ctx.createGain(); mix.gain.value = 0.08; a.connect(mix); b.connect(mix); mix.connect(g); a.start(); b.start();
  let alive = true, on = true;
  const cyc = () => { if (!alive) return; const t = now(); g.gain.setValueAtTime(on ? 1 : 0, t); setTimeout(cyc, on ? 1600 : 2400); on = !on; }; cyc();
  return { stop() { alive = false; g.gain.setValueAtTime(0, now()); setTimeout(() => { a.stop(); b.stop(); }, 100); } };
}
// your own breathing: faster when you run, ragged when you're scared, gone when you hold it
let breathG = null, breathF = null, breathT = 0;
export function breath(dt, rate, vol) {
  if (!ctx) return;
  if (!breathG) { const n = noise(true); breathF = filt('bandpass', 700, 1.2); breathG = ctx.createGain(); breathG.gain.value = 0; n.connect(breathF).connect(breathG).connect(sfx); n.start(); }
  breathT += dt * rate;
  const ph = (breathT % 1), inhale = ph < 0.45, k = inhale ? Math.sin((ph / 0.45) * Math.PI) : Math.sin(((ph - 0.45) / 0.55) * Math.PI) * 0.7;
  breathG.gain.setTargetAtTime(Math.max(0, k) * vol, now(), 0.03);
  breathF.frequency.setTargetAtTime(inhale ? 900 : 600, now(), 0.05);
}
export function heartbeat(dt, bpm, vol) {
  if (!ctx || vol < 0.01) return;
  heartT -= dt; if (heartT > 0) return; heartT = 60 / bpm;
  const t = now();
  for (const [o, v] of [[0, 1], [0.16, 0.7]]) { const s = ctx.createOscillator(); s.frequency.setValueAtTime(70, t + o); s.frequency.exponentialRampToValueAtTime(38, t + o + 0.12); const g = out(null, 0, 0); s.connect(g); env(g, t + o, 0.008, vol * v, 0.16); s.start(t + o); s.stop(t + o + 0.25); }
}

export function scream(pos, vol = 1, len = 1.6) {
  if (!ctx) return; const t = now();
  const g = out(pos, 0, 0.7);
  for (const [fq, ty] of [[620, 'sawtooth'], [655, 'square'], [930, 'sawtooth'], [310, 'sawtooth']]) {
    const o = ctx.createOscillator(); o.type = ty; o.frequency.setValueAtTime(fq * 0.7, t); o.frequency.exponentialRampToValueAtTime(fq * 1.3, t + 0.12); o.frequency.exponentialRampToValueAtTime(fq * 0.5, t + len);
    const vib = ctx.createOscillator(); vib.frequency.value = 9 + Math.random() * 6; const vg = ctx.createGain(); vg.gain.value = fq * 0.05; vib.connect(vg).connect(o.frequency); vib.start(t); vib.stop(t + len);
    const og = ctx.createGain(); og.gain.value = 0.07; o.connect(og).connect(g); o.start(t); o.stop(t + len);
  }
  const n = noise(), bp = filt('bandpass', 1500, 0.8), ng = ctx.createGain(); ng.gain.value = 0.6; n.connect(bp).connect(ng).connect(g); n.start(t); n.stop(t + len);
  env(g, t, 0.02, vol, len);
}
// whispering: shaped noise through moving formants
export function whisper(pos, muffled = 0, len = 1.6, vol = 0.18) {
  if (!ctx) return; const t = now();
  const n = noise(), g = out(pos, muffled, 0.6), hp = filt('highpass', 900);
  const f1 = filt('bandpass', 1200, 6), f2 = filt('bandpass', 2600, 8), mix = ctx.createGain();
  n.connect(hp); hp.connect(f1).connect(mix); hp.connect(f2).connect(mix); mix.connect(g);
  const syll = Math.floor(len * 5);
  g.gain.setValueAtTime(0.0001, t);
  for (let i = 0; i < syll; i++) { const tt = t + i * (len / syll); g.gain.linearRampToValueAtTime(vol * (0.4 + Math.random() * 0.6), tt + 0.04); g.gain.linearRampToValueAtTime(vol * 0.05, tt + len / syll * 0.9); f1.frequency.setValueAtTime(800 + Math.random() * 900, tt); f2.frequency.setValueAtTime(2000 + Math.random() * 1500, tt); }
  g.gain.linearRampToValueAtTime(0.0001, t + len + 0.1);
  n.start(t, Math.random()); n.stop(t + len + 0.2);
}
// ---------- dread ----------
// the house goes quiet: the rain and the wind drop away for a few seconds (before something happens)
let hushUntil = 0;
export function hush(sec = 3) {
  if (!ctx) return; const t = now(); hushUntil = t + sec;
  amb.gain.cancelScheduledValues(t); amb.gain.setTargetAtTime(0.12, t, 0.35); amb.gain.setTargetAtTime(0.9, t + sec, 1.2);
}
export const hushed = () => !!ctx && now() < hushUntil;
// its neck: a wet crack, then the small clicks of it turning
export function crack(pos, muffled = 0) {
  if (!ctx) return; const t = now();
  for (let i = 0; i < 7; i++) {
    const n = noise(), g = out(pos, muffled, 0.3), b = filt('bandpass', 1400 + Math.random() * 3000, 6);
    const tt = t + (i === 0 ? 0 : 0.12 + i * 0.05 + Math.random() * 0.03);
    n.connect(b).connect(g); env(g, tt, 0.001, i === 0 ? 0.7 : 0.25, i === 0 ? 0.05 : 0.02); n.start(tt, Math.random()); n.stop(tt + 0.12);
  }
}

// ---------- ambience: a city morning (birds, traffic far off, the fridge), or rain for the night drive ----------
let birdsG, trafficG, humG, rainG, droneG, droneF, birdT = 0, heartT = 0;
function startAmbience() {
  const t = noise(true), tf = filt('lowpass', 420); trafficG = ctx.createGain(); trafficG.gain.value = 0.04;
  t.connect(tf).connect(trafficG).connect(amb); t.start();
  const lfo = ctx.createOscillator(); lfo.frequency.value = 0.05; const lg = ctx.createGain(); lg.gain.value = 140; lfo.connect(lg).connect(tf.frequency); lfo.start();
  humG = ctx.createGain(); humG.gain.value = 0;
  for (const fq of [60, 120]) { const o = ctx.createOscillator(); o.frequency.value = fq; const g = ctx.createGain(); g.gain.value = fq === 60 ? 0.6 : 0.25; o.connect(g).connect(humG); o.start(); }
  humG.connect(amb);
  const r = noise(true), rf = filt('lowpass', 1600), rh = filt('highpass', 300); rainG = ctx.createGain(); rainG.gain.value = 0;
  r.connect(rh).connect(rf).connect(rainG).connect(amb); r.start();
  droneG = ctx.createGain(); droneG.gain.value = 0; droneF = filt('lowpass', 200);
  for (const fq of [41, 41.6, 61.7]) { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = fq; o.connect(droneF); o.start(); }
  droneF.connect(droneG).connect(amb);
  birdsG = ctx.createGain(); birdsG.gain.value = 1; birdsG.connect(amb);
}
// outdoors 0..1, birds 0..1 (they go quiet as the loops go wrong), fear 0..1, rain for the night drive
export function ambience(dt, { outdoors = 0, birds = 1, fear = 0, rain = 0, hum = 0.3, traffic = 1 }) {
  if (!ctx) return;
  const t = now();
  trafficG.gain.setTargetAtTime((0.015 + outdoors * 0.07) * traffic, t, 0.5);
  humG.gain.setTargetAtTime(hum * 0.01 * (1 - outdoors), t, 0.5);
  rainG.gain.setTargetAtTime(rain * 0.16, t, 0.4);
  droneG.gain.setTargetAtTime(fear * 0.12, t, 0.6);
  droneF.frequency.setTargetAtTime(120 + fear * 500, t, 0.6);
  birdT -= dt;
  if (birdT <= 0) { birdT = 0.6 + Math.random() * 2.4; if (birds > 0.05) chirp(outdoors > 0.5 ? 0.06 : 0.018, birds); }
}
function chirp(vol, birds) {
  const t = now(), n = 2 + Math.floor(Math.random() * 4), base = 2600 + Math.random() * 1800;
  for (let i = 0; i < n; i++) {
    const o = ctx.createOscillator(); o.type = 'sine'; const tt = t + i * (0.09 + Math.random() * 0.05);
    o.frequency.setValueAtTime(base * (0.9 + Math.random() * 0.2), tt); o.frequency.exponentialRampToValueAtTime(base * (birds < 0.5 ? 0.5 : 1.35), tt + 0.07);
    const g = ctx.createGain(); g.connect(birdsG); o.connect(g); env(g, tt, 0.005, vol * birds, 0.07); o.start(tt); o.stop(tt + 0.1);
  }
}

// ---------- the morning ----------
// the alarm clock: the flat electronic beep every morning starts with
let alarmT = 0;
export function alarm(dt, pos) {
  if (!ctx) return; alarmT -= dt; if (alarmT > 0) return; alarmT = 1.0;
  const t = now();
  for (let i = 0; i < 4; i++) { const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = 2050; const g = out(pos, 0, 0.15); const lp = filt('lowpass', 3500); o.connect(lp).connect(g); env(g, t + i * 0.13, 0.002, 0.09, 0.07); o.start(t + i * 0.13); o.stop(t + i * 0.13 + 0.1); }
}
// gas from the stove: a thin hiss that gets louder the closer you are
export function hissLoop(pos) {
  if (!ctx) return { set() {}, stop() {} };
  const n = noise(true), hp = filt('highpass', 4200), g = out(pos, 0, 0.1); g.gain.value = 0;
  n.connect(hp).connect(g); n.start();
  return { set(v) { g.gain.setTargetAtTime(v, now(), 0.3); }, stop() { g.gain.setTargetAtTime(0.0001, now(), 0.1); setTimeout(() => n.stop(), 500); } };
}
export function explosion(pos, vol = 1) {
  if (!ctx) return; const t = now();
  const n = noise(), lp = filt('lowpass', 900), g = out(pos, 0, 0.9);
  n.connect(lp).connect(g); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(vol * 0.3, t + 0.5); g.gain.exponentialRampToValueAtTime(0.0001, t + 3.5);
  lp.frequency.setValueAtTime(4000, t); lp.frequency.exponentialRampToValueAtTime(200, t + 2);
  n.start(t); n.stop(t + 3.6);
  thud(pos, vol, 0, 40); glass(pos, vol * 0.5);
}
export function glass(pos, vol = 0.5) {
  if (!ctx) return; const t = now();
  for (let i = 0; i < 14; i++) { const m = noise(), mg = out(pos, 0, 0.3), b = filt('bandpass', 3500 + Math.random() * 5000, 9); m.connect(b).connect(mg); const tt = t + Math.random() * 0.5; env(mg, tt, 0.001, vol * 0.25, 0.06 + Math.random() * 0.1); m.start(tt, Math.random()); m.stop(tt + 0.25); }
}
// wet, heavy: the sound bodies make
export function splat(pos, vol = 0.8) {
  if (!ctx) return; const t = now();
  const n = noise(), lp = filt('lowpass', 700), g = out(pos, 0, 0.4); n.connect(lp).connect(g); env(g, t, 0.003, vol, 0.25); n.start(t, Math.random()); n.stop(t + 0.35);
  thud(pos, vol * 0.8, 0, 55);
  for (let i = 0; i < 4; i++) { const m = noise(), mg = out(pos, 0, 0.2), b = filt('bandpass', 400 + Math.random() * 500, 3); m.connect(b).connect(mg); const tt = t + 0.05 + Math.random() * 0.3; env(mg, tt, 0.01, vol * 0.3, 0.12); m.start(tt, Math.random()); m.stop(tt + 0.2); }
}
export function crunch(pos, vol = 0.8) {
  if (!ctx) return; crack(pos, 0); splat(pos, vol);
  const t = now(); for (let i = 0; i < 10; i++) { const n = noise(), g = out(pos, 0, 0.2), b = filt('bandpass', 900 + Math.random() * 2400, 5); const tt = t + Math.random() * 0.2; n.connect(b).connect(g); env(g, tt, 0.001, vol * 0.4, 0.03); n.start(tt, Math.random()); n.stop(tt + 0.08); }
}
export function ding(pos) {
  if (!ctx) return; const t = now();
  for (const [fq, d] of [[1320, 0], [990, 0.35]]) { const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = fq; const g = out(pos, 0, 0.5); o.connect(g); env(g, t + d, 0.005, 0.12, 1.2); o.start(t + d); o.stop(t + d + 1.3); }
}
export function bell(pos) { // the bell over the shop door
  if (!ctx) return; const t = now();
  for (let i = 0; i < 3; i++) { const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = 2400 + i * 330; const g = out(pos, 0, 0.4); o.connect(g); env(g, t + i * 0.06, 0.002, 0.08, 0.6); o.start(t + i * 0.06); o.stop(t + i * 0.06 + 0.7); }
}
// a machine running: the elevator motor, a truck, the bus. Returns a handle to move it and change its pitch.
export function engine(pos, { freq = 45, vol = 0.12, cutoff = 600 } = {}) {
  if (!ctx) return { set() {}, stop() {} };
  const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = freq;
  const o2 = ctx.createOscillator(); o2.type = 'square'; o2.frequency.value = freq * 0.5;
  const lp = filt('lowpass', cutoff), g = ctx.createGain(); g.gain.value = 0;
  const n = noise(true), nb = filt('bandpass', 300, 0.8), ng = ctx.createGain(); ng.gain.value = 0.4;
  o.connect(lp); o2.connect(lp); n.connect(nb).connect(ng).connect(lp); lp.connect(g);
  const p = ctx.createPanner(); p.panningModel = 'HRTF'; p.distanceModel = 'inverse'; p.refDistance = 3; p.rolloffFactor = 1.1; p.maxDistance = 80;
  g.connect(p); p.connect(sfx);
  const place = (q) => { if (!q) return; if (p.positionX) { p.positionX.value = q.x; p.positionY.value = q.y; p.positionZ.value = q.z; } else p.setPosition(q.x, q.y, q.z); };
  place(pos); o.start(); o2.start(); n.start(); g.gain.setTargetAtTime(vol, now(), 0.2);
  return {
    set(q, k = 1, v = vol) { place(q); o.frequency.setTargetAtTime(freq * k, now(), 0.1); o2.frequency.setTargetAtTime(freq * k * 0.5, now(), 0.1); g.gain.setTargetAtTime(v, now(), 0.1); },
    stop() { g.gain.setTargetAtTime(0.0001, now(), 0.15); setTimeout(() => { o.stop(); o2.stop(); n.stop(); }, 600); },
  };
}
export function horn(pos, len = 1.2, low = false) {
  if (!ctx) return; const t = now();
  const g = out(pos, 0, 0.3);
  for (const fq of low ? [150, 188] : [330, 415]) { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = fq; const lp = filt('lowpass', 1800); const og = ctx.createGain(); og.gain.value = 0.12; o.connect(lp).connect(og).connect(g); o.start(t); o.stop(t + len); }
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(1, t + 0.03); g.gain.setValueAtTime(1, t + len - 0.08); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
}
export function screech(pos, len = 1.4) {
  if (!ctx) return; const t = now();
  const n = noise(), bp = filt('bandpass', 2400, 14), g = out(pos, 0, 0.3); n.connect(bp).connect(g);
  bp.frequency.setValueAtTime(2800, t); bp.frequency.linearRampToValueAtTime(1900, t + len);
  env(g, t, 0.05, 0.5, len); n.start(t, Math.random()); n.stop(t + len + 0.1);
}
export function airBrake(pos) {
  if (!ctx) return; const t = now();
  const n = noise(), hp = filt('highpass', 2500), g = out(pos, 0, 0.3); n.connect(hp).connect(g); env(g, t, 0.01, 0.25, 0.9); n.start(t, Math.random()); n.stop(t + 1);
}
export function gunshot(pos, vol = 1) {
  if (!ctx) return; const t = now();
  const n = noise(), lp = filt('lowpass', 3000), g = out(pos, 0, 0.9); n.connect(lp).connect(g); env(g, t, 0.001, vol, 0.35); n.start(t, Math.random()); n.stop(t + 0.5);
  thud(pos, vol, 0, 70);
}
export function cable(pos) { // the elevator cable letting go
  if (!ctx) return; const t = now();
  for (let i = 0; i < 3; i++) { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(900 - i * 200, t + i * 0.05); o.frequency.exponentialRampToValueAtTime(60, t + 0.6 + i * 0.05); const g = out(pos, 0, 0.6); o.connect(g); env(g, t + i * 0.05, 0.003, 0.18, 0.6); o.start(t + i * 0.05); o.stop(t + 0.8); }
  thud(pos, 0.9, 0, 50);
}
// the radio on the kitchen counter: a cheerful little tune that slows and sours, loop by loop
export function radioTune(pos, sour = 0) {
  if (!ctx) return { stop() {} };
  const g = out(pos, 0, 0.3); g.gain.value = 0.5; const lp = filt('lowpass', 2400 - sour * 1600); lp.connect(g);
  const notes = [72, 76, 79, 76, 74, 77, 81, 77, 72, 76, 79, 84, 83, 79, 77, 74];
  let alive = true, i = 0;
  const rate = 0.26 * (1 + sour * 0.9);
  const tick = () => {
    if (!alive) return;
    const n = notes[i % notes.length] - (sour > 0.5 && i % 4 === 3 ? 1 : 0), t = now();
    const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = 440 * Math.pow(2, (n - 69 - sour * 3) / 12) * (1 + (Math.random() - 0.5) * sour * 0.03);
    const e = ctx.createGain(); o.connect(e).connect(lp); env(e, t, 0.01, 0.06, rate * 1.6); o.start(t); o.stop(t + rate * 1.8);
    if (i % 2 === 0) { const b = ctx.createOscillator(); b.type = 'sine'; b.frequency.value = 440 * Math.pow(2, (n - 81 - sour * 3) / 12); const be = ctx.createGain(); b.connect(be).connect(lp); env(be, t, 0.01, 0.05, rate * 2); b.start(t); b.stop(t + rate * 2.2); }
    i++; setTimeout(tick, rate * 1000);
  };
  tick();
  return { stop() { alive = false; g.gain.setTargetAtTime(0.0001, now(), 0.1); } };
}
export function beep(vol = 0.1, fq = 1000, len = 0.25) {
  if (!ctx) return; const t = now(); const o = ctx.createOscillator(); o.frequency.value = fq; const g = out(null, 0, 0.1); o.connect(g); env(g, t, 0.005, vol, len); o.start(t); o.stop(t + len + 0.05);
}
// the walk signal's chirp at the crossing
export function walkChirp(pos) {
  if (!ctx) return; const t = now();
  const o = ctx.createOscillator(); o.type = 'square'; o.frequency.setValueAtTime(1800, t); o.frequency.exponentialRampToValueAtTime(900, t + 0.06);
  const g = out(pos, 0, 0.2); o.connect(g); env(g, t, 0.002, 0.04, 0.06); o.start(t); o.stop(t + 0.1);
}
// a long low tone from nowhere: it's here
export function presence(vol = 0.3, len = 3) {
  if (!ctx) return; const t = now();
  for (const fq of [55, 58.3, 110.5]) { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = fq; const lp = filt('lowpass', 300); const g = out(null, 0, 0.8); o.connect(lp).connect(g); env(g, t, 0.6, vol * 0.2, len); o.start(t); o.stop(t + len + 0.7); }
}
export function wiper(vol = 0.05) {
  if (!ctx) return; const t = now(); const n = noise(), bp = filt('bandpass', 900, 2), g = out(null, 0, 0.1); n.connect(bp).connect(g); env(g, t, 0.1, vol, 0.35); n.start(t, Math.random()); n.stop(t + 0.5);
}
export function fire(pos, len = 4) {
  if (!ctx) return; const t = now();
  const n = noise(true), lp = filt('lowpass', 1200), g = out(pos, 0, 0.5); n.connect(lp).connect(g);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.25, t + 0.2); g.gain.setValueAtTime(0.25, t + len - 0.5); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  n.start(t); n.stop(t + len);
  for (let i = 0; i < len * 8; i++) { const m = noise(), mg = out(pos, 0, 0.2), b = filt('bandpass', 2000 + Math.random() * 3000, 6); const tt = t + Math.random() * len; m.connect(b).connect(mg); env(mg, tt, 0.001, 0.12, 0.02); m.start(tt, Math.random()); m.stop(tt + 0.05); }
}
