// The day. 7:00 AM, every time. Everything that kills Owen, what fixes it, what he finds out, and what the
// world turns into while he keeps fixing things instead of facing them.
import * as THREE from 'three';
import { W, Y4, setDoor, zoneOf, clearLine, makeCar } from './world.js';
import { makePerson, makeFaceless, animate, pose, setFaceless } from './people.js';
import * as TX from './tex.js';

export const SEC_PER_MIN = 7; // one minute of the morning is 7 real seconds
export const BUS_AT = 38, BUS_LEAVES = 40.4, GAS_AT = 10, LATE_AT = 42.5;

// how the world looks, loop by loop
export const MOOD = [
  null,
  { sky: 0x9ac4ec, sun: 3.2, sunCol: 0xfff0d8, hemi: 1.49, fog: 0.006, drain: 0, birds: 1 },
  { sky: 0x96bce4, sun: 3.0, sunCol: 0xfff0d8, hemi: 1.42, fog: 0.007, drain: 0.04, birds: 1 },
  { sky: 0x8ca8c4, sun: 2.4, sunCol: 0xf8e8d0, hemi: 1.28, fog: 0.009, drain: 0.12, birds: 0.75 },
  { sky: 0x8a9098, sun: 1.5, sunCol: 0xe8e0d8, hemi: 1.15, fog: 0.012, drain: 0.25, birds: 0.45 },
  { sky: 0x70767c, sun: 1.0, sunCol: 0xd8d4d0, hemi: 1.01, fog: 0.016, drain: 0.35, birds: 0.25 },
  { sky: 0x5c5c62, sun: 0.7, sunCol: 0xd0c0b8, hemi: 0.88, fog: 0.021, drain: 0.48, birds: 0.08 },
  { sky: 0x4c3c3c, sun: 0.5, sunCol: 0xd09080, hemi: 0.74, fog: 0.026, drain: 0.58, birds: 0 },
  { sky: 0x3a1c16, sun: 0.38, sunCol: 0xc05040, hemi: 0.68, fog: 0.032, drain: 0.66, birds: 0 },
];
export const mood = (L) => MOOD[Math.min(MOOD.length - 1, Math.max(1, L))];

// every way to die: what it's called, the line on the death screen, and what Owen knows next time
export const DEATHS = {
  gas: { title: 'GAS', line: 'The kettle never boiled.', learn: 'There was gas. The hiss by the stove. Turn it off — the valve under the kitchen sink.' },
  elevator: { title: 'THE ELEVATOR', line: 'Eleven seconds, all the way down.', learn: 'The elevator. Never the elevator. Take the stairs.' },
  ac: { title: 'FROM ABOVE', line: 'You never saw it coming. Neither did the man who installed it.', learn: 'Something falls on the front steps. Wait in the doorway for it, or leave by the back door in the laundry room.' },
  truck: { title: 'RED LIGHT', line: 'The driver didn\'t stop either.', learn: 'A truck runs the light. Wait at the curb until it has gone by.' },
  robbery: { title: 'WRONG PLACE', line: 'Forty-two dollars and a bus ticket.', learn: 'After you pay, a man comes in with a gun. Crouch behind the shelves when the bell rings. Or don\'t buy a ticket at all: your bus pass is in the glovebox of your car.' },
  push: { title: 'MIND THE CURB', line: 'Two hands, flat on your back. Gentle, almost.', learn: 'Someone pushes you in front of the bus. Stand back from the curb, by the shelter, until it has stopped.' },
  late: { title: 'LATE', line: 'You were late. He was waiting.', learn: 'Don\'t miss the 7:40.' },
  him: { title: 'NO FACE', line: 'He needed one. You weren\'t using yours.', learn: 'He follows you now. He only moves when you aren\'t looking at him.' },
};
export const CLUES = {
  shirt: 'Last night\'s shirt: blood on the cuff. Not yours.',
  dana: 'Dana\'s voicemail: you left the party drunk. You told her you hit a deer.',
  car: 'Your car: the headlight smashed, grey wool and blood in the grille.',
  name: 'His name was Martin Vey. Forty-one. A night nurse. Route 9.',
};
export const remembered = (save) => !!(save.clues.shirt && save.clues.dana && save.clues.car && save.clues.name);

export function createDay(g) {
  const { scene, A, voice, ui } = g;
  const P = g.P;
  let F = {}; // this loop's flags
  const L = () => g.save.loop;
  const say = (who, text, dur = 4, kind = 'talk') => { ui.sub(who === 'OWEN' ? `<i>${text}</i>` : `<b>${who === 'HIM' ? '' : NAME[who] + ': '}</b>${text}`, dur, who === 'HIM' ? 'him' : kind); voice.say(who, text); };
  const NAME = { DANA: 'Dana', NEWS: 'TV', RADIO: 'Radio', PELL: 'Mrs. Pell', CLERK: 'Clerk', ROBBER: 'Man', DRIVER: 'Driver', COP: 'Officer', OWEN: 'Owen', HIM: '' };
  const think = (text, dur = 4) => ui.sub(text, dur, 'think');
  const clue = (id) => { if (!g.save.clues[id]) { g.save.clues[id] = true; g.persist(); ui.toast('You remember something'); A.sting(0.25); if (remembered(g.save)) setTimeout(() => { think('You remember. You remember all of it. The road, the rain, the sound. His name.', 6); ui.objective(); }, 3500); } };

  // ---------- people ----------
  const him = makeFaceless(); scene.add(him.root); him.root.visible = false;
  const pell = makePerson({ face: 'pell', shirt: 0x8a5a7a, pants: 0x5a4a5a, shoes: 0x3a2a2a }); scene.add(pell.root); pell.root.scale.setScalar(0.92);
  const clerk = makePerson({ face: 'clerk', shirt: 0xc83030, pants: 0x2a2a30, shortSleeves: true }); scene.add(clerk.root);
  const robber = makePerson({ face: 'robber', shirt: 0x2a2a2a, pants: 0x3a3a48, coat: 0x2a2a30 }); scene.add(robber.root); robber.root.visible = false;
  const gun = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.08, 0.5), new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.6, roughness: 0.4 })); gun.position.set(0, -0.32, 0.22); robber.limbs.R.el.add(gun);
  const cop = makePerson({ face: 'cop', shirt: 0x1a2a4a, pants: 0x1a2a4a, hat: 0x1a2a4a }); scene.add(cop.root); cop.root.position.set(12.2, 0.15, 3.0); cop.root.rotation.y = -0.4;
  const walkers = [
    { r: makePerson({ face: 'walker1', shirt: 0x6a8a4a, pants: 0x2a2a3a }), z: 2.0, x0: -24, x1: 24, x: -10, dir: 1, sp: 1.3 },
    { r: makePerson({ face: 'walker2', shirt: 0xc8a050, pants: 0x4a3a2a, coat: 0x7a5a3a }), z: 14.0, x0: -24, x1: 24, x: 12, dir: -1, sp: 1.1 },
    { r: makePerson({ face: 'walker3', shirt: 0x8a3a3a, pants: 0x2a2a2a }), z: 1.4, x0: -24, x1: 24, x: 16, dir: -1, sp: 0.9 },
  ];
  walkers.forEach((w) => scene.add(w.r.root));
  // the bus: driver, passengers. Everyone on it loses their face, sooner or later.
  const bus = new THREE.Group(); scene.add(bus);
  {
    const add = (x0, y0, z0, x1, y1, z1, m) => { const b = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), m); b.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); b.castShadow = true; bus.add(b); return b; };
    add(0, 0.4, -1.25, 11, 3.0, 1.25, W.mat.busBody); add(0, 1.4, -1.27, 11, 2.3, 1.27, W.mat.carGlass); add(0, 0.6, -1.27, 11, 0.9, 1.27, W.mat.busStripe);
    add(-0.02, 1.2, -1.1, 0.02, 2.6, 1.1, W.mat.carGlass);
    add(0.4, 0.4, 1.26, 1.4, 2.6, 1.28, W.mat.darkSteel); // the door (on the kerb side, +z)
    for (const x of [1.8, 9.2]) for (const z of [-1.2, 1.2]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.3, 14), W.mat.tyre); w.rotation.x = Math.PI / 2; w.position.set(x, 0.5, z); bus.add(w); }
    const lt = add(-0.03, 0.7, -1.0, 0.0, 0.9, -0.6, W.mat.whiteLight); lt.material = lt.material.clone(); lt.material.emissiveIntensity = 2; const rt = lt.clone(); rt.position.z = 0.8; bus.add(rt);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.3), new THREE.MeshBasicMaterial({ map: TX.sign('40  CALLOW ST', { w: 256, h: 44, bg: '#111', fg: '#ffb020', font: 'bold 28px monospace' }) }));
    sign.position.set(-0.03, 2.75, 0); sign.rotation.y = -Math.PI / 2; bus.add(sign); bus.userData.sign = sign;
  }
  const driver = makePerson({ face: 'driver', shirt: 0x3a5a7a, pants: 0x2a2a3a }); pose(driver, 'sit'); driver.root.position.set(0.9, 0.35, -0.6); driver.root.rotation.y = -Math.PI / 2; bus.add(driver.root);
  const riders = [];
  for (let i = 0; i < 5; i++) { const r = makePerson({ face: ['walker1', 'walker2', 'walker3', 'pell', 'cop'][i], shirt: [0x5a6a7a, 0x8a6a4a, 0x4a4a4a, 0x7a3a4a, 0x3a5a3a][i], pants: 0x2a2a30 }); pose(r, 'sit'); r.root.position.set(3 + i * 1.5, 0.35, i % 2 ? 0.7 : -0.7); r.root.rotation.y = -Math.PI / 2; bus.add(r.root); riders.push(r); }
  bus.visible = false;
  let busEng = null;
  // the truck that runs the light
  const truck = new THREE.Group(); scene.add(truck);
  { const c = makeCar(W.mat.carRed, 2.6, 2.3); c.position.x = -1.3; c.scale.y = 1.35; truck.add(c);
    const box = new THREE.Mesh(new THREE.BoxGeometry(5.2, 2.8, 2.4), W.mat.white); box.position.set(-5.2, 1.9, 0); box.castShadow = true; truck.add(box);
    for (const x of [-6.5, -4.2]) for (const z of [-1.15, 1.15]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.3, 14), W.mat.tyre); w.rotation.x = Math.PI / 2; w.position.set(x, 0.45, z); truck.add(w); } }
  truck.visible = false; truck.position.set(-60, 0, 7);
  let truckEng = null;
  // the ordinary traffic on the far lane: it waits for you
  const cars = [makeCar(W.mat.carWhite), makeCar(W.mat.carRed)];
  cars.forEach((c, i) => { c.rotation.y = Math.PI; c.position.set(40 + i * 45, 0, 10.0); scene.add(c); c.userData.v = 9; });
  // Owen, in the mirror only
  const mirrorMe = g.mirrorRig, mirrorHim = makeFaceless(); mirrorHim.root.traverse((c) => c.layers.set(1)); scene.add(mirrorHim.root); mirrorHim.root.visible = false;

  // ---------- the morning, again ----------
  let hiss = null, radio = null, tvT = 0, tvMode = 'off';
  function start() {
    F = { alarm: true, gasOff: false, dressed: false, wallet: false, keys: false, pass: false, ticket: false, elev: 0, acArmed: 0, acState: 'up', truck: 'idle', truckT: 0, robbery: 'none', bus: 'away', himSpot: null, seen: {}, trail: [], trailT: 0, stalkI: 0, stalkGone: 0, lookT: 0, stair: 0, warnedGas: false };
    g.F = F;
    const l = L();
    for (const id of ['bed', 'bath', 'front', 'front0', 'stair4', 'stair0', 'laundry', 'back', 'shop']) { const d = W.doors.get(id); setDoor(d, false); d.ang = 0; d.pivot.rotation.y = 0; }
    setDoor(W.doors.get('bed'), true); W.doors.get('bed').ang = W.doors.get('bed').target; W.doors.get('bed').pivot.rotation.y = W.doors.get('bed').target;
    // the elevator, the air conditioner, the truck, the bus, the robbery
    W.meshes.elevL.position.x = 5.96; W.meshes.elevR.position.x = 6.64; W.meshes.elevCol.off = false; W.meshes.elev0L.position.x = 5.96; W.meshes.elev0R.position.x = 6.64;
    W.meshes.ac.position.copy(W.meshes.acHome); W.meshes.ac.rotation.set(0, 0, 0);
    truck.visible = false; truck.position.set(-60, 0, 7); truckEng?.stop(); truckEng = null;
    bus.visible = false; busEng?.stop(); busEng = null;
    robber.root.visible = false; pose(robber, 'stand');
    clerk.root.visible = true; clerk.root.position.set(8.6, 0.15, 21.0); clerk.root.rotation.set(0, Math.PI, 0); clerk.hips.rotation.set(0, 0, 0); pose(clerk, 'stand');
    pell.root.visible = l < 8; pell.root.position.set(-5.5, Y4, -7.35); pell.root.rotation.set(0, 0, 0);
    him.root.visible = false; setFaceless(him, true); mirrorHim.root.visible = false;
    for (const w of walkers) { w.x = w.x0 + Math.random() * (w.x1 - w.x0); w.r.root.position.set(w.x, 0.15, w.z); w.r.root.visible = true; setFaceless(w.r, l >= 6); }
    riders.forEach((r, i) => setFaceless(r, l >= 3 + i));
    setFaceless(driver, l >= 7); setFaceless(clerk, l >= 6); setFaceless(pell, l >= 4); setFaceless(cop, l >= 7);
    // the world, wrong in new ways each time
    W.meshes.photo.material.map = TX.photo(Math.min(3, Math.max(0, l - 1))); W.meshes.photo.material.needsUpdate = true;
    W.meshes.door4E.visible = l >= 3; W.meshes.hallWrite.visible = l >= 5;
    W.meshes.sinkBlood.visible = l >= 5; W.meshes.mirrorWrite.visible = l >= 6 && !!g.save.clues.name;
    W.meshes.msgLight.material.emissiveIntensity = 2;
    const all4 = l >= 7;
    W.signs.forEach((s, i) => { s.material.map = TX.sign(all4 ? '4' : i === 0 ? 'L' : String(i), { w: 256, h: 256, bg: '#1a3a1a', fg: all4 && i !== 4 ? '#c8a8a0' : '#e8e8d0', font: 'bold 110px Arial' }); s.material.needsUpdate = true; });
    W.meshes.busSign.material.map = TX.sign(l >= 7 ? 'BUS 40\nROUTE 9' : 'BUS 40\nCALLOW ST', { w: 256, h: 256, bg: '#1a3a6a', fg: '#ffffff', font: 'bold 44px Arial' }); W.meshes.busSign.material.needsUpdate = true;
    W.meshes.busSignBack.material.map = W.meshes.busSign.material.map; W.meshes.busSignBack.material.needsUpdate = true;
    bus.userData.sign.material.map = TX.sign(l >= 7 ? '40  ROUTE 9' : '40  CALLOW ST', { w: 256, h: 44, bg: '#111', fg: '#ffb020', font: 'bold 28px monospace' }); bus.userData.sign.material.needsUpdate = true;
    W.meshes.oppWindow.material.emissiveIntensity = l >= 2 ? 0.9 : 0.3;
    hiss?.stop(); hiss = A.hissLoop(new THREE.Vector3(1.3, Y4 + 1, -5.6));
    radio?.stop(); radio = null; tvMode = 'off'; drawTV();
    drawClock('7:00');
  }

  // ---------- the screens: the alarm clock, the TV, the walk signals ----------
  function drawClock(txt) { const t = W.meshes.clockTex, c = t.g; c.fillStyle = '#060101'; c.fillRect(0, 0, 128, 48); c.font = 'bold 34px monospace'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#ff2410'; c.fillText(txt, 64, 26); t.needsUpdate = true; }
  let lastClock = '';
  function drawTV() {
    const t = W.meshes.tvTex, c = t.g;
    if (tvMode === 'off') { c.fillStyle = '#050505'; c.fillRect(0, 0, 160, 96); }
    else if (tvMode === 'static') { const img = c.createImageData(160, 96); for (let i = 0; i < img.data.length; i += 4) { const v = Math.random() * 200; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; } c.putImageData(img, 0, 0); if (L() >= 7) { c.fillStyle = '#000'; c.font = 'bold 22px monospace'; c.textAlign = 'center'; c.fillText('YOU\'RE LATE', 80, 52); } }
    else {
      const news = tvMode === 'news';
      c.fillStyle = news ? '#1a2a4a' : '#3a7ac8'; c.fillRect(0, 0, 160, 96);
      if (news) { c.fillStyle = '#2a2a30'; c.fillRect(50, 14, 60, 56); c.fillStyle = '#c8a090'; c.beginPath(); c.arc(80, 32, 11, 0, 7); c.fill(); c.fillStyle = '#5a5a60'; c.fillRect(66, 44, 28, 26); if (L() < 4) { c.fillStyle = '#222'; c.fillRect(75, 30, 3, 2); c.fillRect(82, 30, 3, 2); } }
      else { c.fillStyle = '#ffd040'; c.beginPath(); c.arc(40, 34, 14, 0, 7); c.fill(); c.fillStyle = '#fff'; c.font = 'bold 18px Arial'; c.fillText('64°', 92, 42); }
      c.fillStyle = '#b01010'; c.fillRect(0, 72, 160, 24); c.fillStyle = '#fff'; c.font = 'bold 10px Arial'; c.textAlign = 'left';
      c.fillText(news ? 'ROUTE 9 HIT-AND-RUN: VICTIM NAMED' : 'CALLOW WEATHER: SUNNY ALL DAY', 4 - (tvT * 30 % 220) + 40, 87); c.textAlign = 'center';
    }
    t.needsUpdate = true;
  }
  function drawWalk(tex, walk) {
    const c = tex.g; c.fillStyle = '#111'; c.fillRect(0, 0, 64, 64);
    c.fillStyle = walk ? '#f0f0e8' : '#ff5020';
    if (walk) { c.beginPath(); c.arc(32, 14, 6, 0, 7); c.fill(); c.fillRect(28, 21, 8, 20); c.save(); c.translate(32, 40); c.rotate(0.4); c.fillRect(-3, 0, 6, 18); c.restore(); c.save(); c.translate(32, 40); c.rotate(-0.4); c.fillRect(-3, 0, 6, 18); c.restore(); }
    else { c.fillRect(20, 24, 24, 26); for (let i = 0; i < 4; i++) c.fillRect(20 + i * 6, 10, 5, 16); c.fillRect(40, 26, 10, 6); }
    tex.needsUpdate = true;
  }
  let walkOn = null;

  // ---------- the things you can use ----------
  const I = {
    alarm: { p: () => F.alarm ? 'Turn off the alarm' : 'Alarm clock', use() { if (F.alarm) { F.alarm = false; A.click(0.4); if (L() === 1) think('7:00 AM. Work. The bus at 7:40. Your head is pounding.', 5); else if (L() === 2) think('7:00. Again? You were... you were dead. You were on fire.', 5); else if (L() >= 6) think('7:00. Of course it is.', 3); } else think(`It says ${clockText()}.`, 2); } },
    wardrobe: { p: () => F.dressed ? null : 'Get dressed', use() { F.dressed = true; A.paper(); ui.toast('Dressed'); if (L() >= 5) think('Every shirt in here is the same grey shirt.', 4); } },
    dresser: { p: () => F.wallet ? null : 'Take your wallet', use() { F.wallet = true; W.meshes.wallet.visible = false; A.pickup(); ui.toast('Wallet ($42)'); } },
    shirt: { p: () => 'Look in the laundry basket', use() { clue('shirt'); think('Last night\'s shirt. Blood on the cuff, gone stiff and brown. It isn\'t yours. You aren\'t cut anywhere.', 6); } },
    keys: { p: () => F.keys ? null : 'Take your car keys', use() { F.keys = true; W.meshes.keys.visible = false; A.pickup(); ui.toast('Car keys'); if (L() >= 3) think('You don\'t remember driving home.', 3); } },
    stove: { p: () => 'Make coffee', use() { if (!F.gasOff) { A.click(0.5); g.die('gas'); } else think('Nothing. No gas. You turned it off at the valve.', 3); } },
    sinkK: { p: () => 'Kitchen sink', use() { think(L() >= 5 ? 'The water runs brown, then red, then clear.' : 'You splash water on your face. It doesn\'t help.', 3); A.click(0.2); } },
    valve: { p: () => F.gasOff ? null : 'Turn off the gas valve', use() { F.gasOff = true; hiss?.stop(); hiss = null; W.meshes.valve.rotation.y = Math.PI / 2; A.click(0.5); A.creak(null, 0.15, 0, 0.3); think('The hissing stops.', 3); } },
    phone: { p: () => 'Play the message', use() { W.meshes.msgLight.material.emissiveIntensity = 0; A.beep(0.1, 900, 0.3); setTimeout(() => {
      if (L() >= 8 && g.save.clues.dana) { say('HIM', 'You\'re late, Owen.', 4); return; }
      const t = 'Owen, it\'s Dana. You left Kerry\'s party really drunk, I tried to take your keys. You called me at one-fifteen and said you hit a deer on Route 9? You sounded... call me back. Please.';
      say('DANA', t, 11); setTimeout(() => clue('dana'), 9000);
    }, 600); } },
    radio: { p: () => radio ? 'Turn the radio off' : 'Turn the radio on', use() {
      if (radio) { radio.stop(); radio = null; voice.cancel(); A.click(0.3); return; }
      A.click(0.3); const l = L();
      if (l >= 7) { radio = A.staticLoop(new THREE.Vector3(0.6, Y4 + 1, -5.7), 0.08); setTimeout(() => { if (radio) say('HIM', 'Martin. Martin. Martin.', 4); }, 1500); return; }
      radio = A.radioTune(new THREE.Vector3(0.6, Y4 + 1, -5.7), Math.min(1, (l - 1) / 5));
      setTimeout(() => { if (!radio) return; if (l >= 4) say('RADIO', 'Good morning, Callow! It\'s seven A.M.... Owen. Wake up, Owen.', 5); else say('RADIO', 'Good morning, Callow, it\'s seven A.M. on a beautiful day. Traffic is light, except out on Route 9, where police are still at the scene.', 7); }, 1200);
    } },
    tv: { p: () => tvMode === 'off' ? 'Turn on the TV' : 'Turn off the TV', use() {
      A.click(0.3);
      if (tvMode !== 'off') { tvMode = 'off'; drawTV(); voice.cancel(); return; }
      const l = L();
      tvMode = l >= 6 ? 'static' : l >= 2 ? 'news' : 'weather'; drawTV();
      if (tvMode === 'news') {
        say('NEWS', 'Police have named the man killed in last night\'s hit-and-run on Route 9 as Martin Vey, forty-one, a night nurse at Saint Agnes. The driver did not stop. Police are asking anyone with information...', 12);
        setTimeout(() => { if (tvMode === 'news') clue('name'); }, 6000);
      } else if (tvMode === 'weather') say('NEWS', 'Sunshine all day in Callow, sixty-four degrees. A beautiful morning.', 5);
      else { const s = A.staticLoop(new THREE.Vector3(5.6, Y4 + 1, -2), 0.06); setTimeout(() => s.stop(), 5000); }
    } },
    photo: { p: () => 'Look at the photo', use() { const l = L(); think(l <= 1 ? 'You and Dana at the lake. The last good summer.' : l === 2 ? 'You and Dana at the lake. Dana\'s face is... smudged. You didn\'t notice that before.' : l === 3 ? 'You and Dana at the lake. Neither of you has a face.' : 'Someone has scratched at it until there\'s nothing left of either of you.', 4); } },
    mirror: { p: () => 'Look in the mirror', use() { const l = L(); if (l >= 5) { think('That\'s you. It has to be you.', 3); A.presence(0.3, 2); } else if (l >= 3) think('You look like you haven\'t slept. You look like someone else.', 3); else think('You look terrible.', 2); } },
    sink: { p: () => 'Bathroom sink', use() { think(L() >= 5 ? 'There\'s blood in the sink. Not yours. It never is.' : 'You run the tap. Your hands are shaking.', 3); } },
    door4E: { p: () => W.meshes.door4E.visible ? 'Open 4E' : null, use() { A.doorSound(new THREE.Vector3(-7.9, Y4 + 1, -7), true); think(L() >= 6 ? 'Behind it there\'s brick, and on the brick someone has scratched a road, over and over, and a little man in the road.' : 'There\'s no 4E. There never was. Behind the door there\'s just brick.', 5); } },
    elevButton: { p: () => F.elev ? null : 'Call the elevator', use() { if (F.elev) return; F.elev = 1; W.meshes.elevBtn.material.emissiveIntensity = 2; A.click(0.3); setTimeout(() => { A.ding(new THREE.Vector3(6.3, Y4 + 1.5, -8)); F.elev = 2; W.meshes.elevCol.off = true; }, 1600); } },
    mail: { p: () => 'Check your mailbox', use() { think(L() >= 4 ? 'One envelope. Inside, a photo of your car on Route 9, taken from the road, in the rain.' : 'Bills. A flyer. A reminder from the DMV.', 4); } },
    notice: { p: () => 'Read the notice', use() { think(L() >= 6 ? '"ELEVATOR OUT OF ORDER." It has always said that. You never read it.' : '"Elevator inspection: overdue. Use stairs if in doubt." — The Management', 5); } },
    car: { p: () => 'Look at the front of your car', use() { clue('car'); think('The headlight is smashed. The bumper is pushed in, the shape of a man\'s thigh. Caught in the grille: grey wool, and blood, and hair.', 7); } },
    glovebox: { p: () => F.pass ? null : F.keys ? 'Open the glovebox' : 'Car door (locked)', use() { if (!F.keys) { think('Locked. Your keys are in the bowl by your front door.', 3); return; } F.pass = true; A.pickup(); ui.toast('Bus pass'); think('Your bus pass. Under it, a bottle, almost empty.', 4); } },
    paper: { p: () => 'Read the newspaper', use() { clue('name'); think('"MAN KILLED IN ROUTE 9 HIT-AND-RUN." Martin Vey, 41, a night nurse at St. Agnes. The photo has no face.', 6); } },
    counter: { p: () => F.ticket || F.robbery !== 'none' ? 'Clerk' : F.wallet ? 'Buy a bus ticket ($2.75)' : 'Buy a bus ticket (no wallet)', use() {
      if (F.ticket || F.robbery !== 'none') { say('CLERK', L() >= 6 ? 'You again. You\'re always here.' : 'Have a good one, man.', 3); return; }
      if (!F.wallet) { say('CLERK', 'Two seventy-five, man. You got money?', 3); think('Your wallet is on the dresser.', 3); return; }
      F.ticket = true; A.pickup(); ui.toast('Bus ticket'); say('CLERK', L() >= 3 ? 'You hear about that guy on Route 9? Somebody just left him there.' : 'There you go. Bus is on time today, for once.', 4);
      F.robbery = 'coming'; F.robT = 3.5;
    } },
    cop: { p: () => 'Talk to the officer', use() { const l = L(); if (remembered(g.save)) say('COP', 'You look like you\'ve seen a ghost, buddy. Whatever it is, go say it to him, not me.', 5); else say('COP', l >= 7 ? 'Route 9. Route 9. Route 9.' : l >= 3 ? 'Long night on Route 9. Some poor guy. Driver just kept going.' : 'Morning. Watch the lights, people drive like maniacs here.', 4); } },
    pell: { p: () => pell.root.visible && P.zone === 'hall4' ? 'Talk to Mrs. Pell' : null, use() { pellTalk(); } },
    bus: { p: () => F.bus === 'stopped' ? (F.pass || F.ticket ? 'Get on the bus' : 'Get on the bus (no ticket)') : null, use() {
      if (!F.pass && !F.ticket) { say('DRIVER', 'Two seventy-five or a pass, pal.', 3); think(g.save.deaths.robbery ? 'Your pass is in your car.' : 'A ticket from the shop. Or your pass, wherever it went.', 3); return; }
      F.bus = 'boarded'; g.ending(remembered(g.save) ? 'passenger' : 'bus');
    } },
    him: { p: () => F.himSpot === 'road' && remembered(g.save) ? 'Say his name' : null, use() { g.ending('name'); } },
  };
  // interactables that aren't in the world yet
  W.inter.push({ id: 'pell', x: -5.5, y: Y4 + 1.5, z: -7.3, r: 2.2 }, { id: 'cop', x: 12.2, y: 1.6, z: 3.0, r: 2.2 }, { id: 'bus', x: -6.6, y: 1.4, z: 11.8, r: 3.2 }, { id: 'him', x: 0, y: 1.6, z: 0, r: 2.8 });
  const himInter = W.inter[W.inter.length - 1];
  const clockText = () => { const m = Math.floor(g.clock); return `7:${String(m).padStart(2, '0')}`; };
  function pellTalk() {
    const l = L();
    const lines = l === 1 ? ['Morning, Owen. You look like you haven\'t slept a wink.'] : l === 2 ? ['Morning, Owen. You look like you haven\'t slept a wink.', 'Did you hear? Some poor man on Route 9.'] : l === 3 ? ['Morning, Owen. You look like you haven\'t slept a wink.', 'Morning, Owen. You look like you haven\'t slept a wink.'] : l <= 5 ? ['Morning, Owen.', 'He\'s been asking for you.'] : ['You\'re late.'];
    say('PELL', lines[Math.min(lines.length - 1, F.pellN = (F.pellN ?? -1) + 1)], 4);
  }

  // ---------- doors ----------
  function door(d) {
    if (d.locked) { think(d.lockedText, 3); A.knock(new THREE.Vector3(d.cx, d.y + 1, d.cz), 1, 0, 0.3); if (d.id.startsWith('stair') && L() >= 5) setTimeout(() => A.knock(new THREE.Vector3(d.cx, d.y + 1, d.cz), 3, 0.3, 0.5), 1200); return; }
    if (d.id === 'front' && !d.open && !F.dressed) { think('You\'re still in your boxers. Get dressed first: the wardrobe in the bedroom.', 3); return; }
    setDoor(d, !d.open);
    A.doorSound(new THREE.Vector3(d.cx, d.y + 1, d.cz), d.open);
    if (d.id === 'front0' && d.open && F.acState === 'up') { F.acArmed = 5.5; setTimeout(() => { A.creak(new THREE.Vector3(0.2, 7, 0.5), 0.5, 0, 1.2); if (g.save.deaths.ac) think('Something creaks, high above the door.', 2.5); }, 300); }
    if (d.id === 'shop' && d.open) A.bell(new THREE.Vector3(5.6, 2.2, 16));
  }

  // ---------- each frame ----------
  const _v = new THREE.Vector3();
  function update(dt, t) {
    const l = L(), clock = g.clock, zone = P.zone;
    // the alarm, the clock face
    if (F.alarm) A.alarm(dt, new THREE.Vector3(-7.6, Y4 + 0.6, -2.6));
    const ct = clockText(); if (ct !== lastClock) { lastClock = ct; drawClock(l >= 7 && Math.random() < 0.5 ? '7:00' : ct); }
    // the gas
    if (hiss) { const d = Math.hypot(P.x - 1.3, P.z + 5.6), inApt = P.y > 11 && P.z > -6; hiss.set(inApt ? Math.min(0.06, 0.012 + Math.max(0, 3 - d) * 0.02) : 0); }
    if (!F.gasOff && clock > 4 && !F.warnedGas && P.y > 11 && P.z > -6) { F.warnedGas = true; think(g.save.deaths.gas ? 'Gas. The smell is everywhere. The valve under the kitchen sink.' : 'Is that... gas? Something smells like gas.', 4); }
    if (!F.gasOff && clock >= GAS_AT && !F.blew) {
      F.blew = true; hiss?.stop(); hiss = null;
      if (P.y > 10 && (zone !== 'stairs' || P.y > 9)) { g.die('gas'); return; }
      A.explosion(new THREE.Vector3(2, Y4 + 1, -3), P.y > 6 ? 0.8 : 0.4); g.shake(0.6); think('Above you, the whole building jumps. Glass rains into the street.', 5);
      F.fire = true;
    }
    // the elevator: the doors open, you step in, they close
    if (F.elev === 2) { W.meshes.elevL.position.x = Math.max(5.31, W.meshes.elevL.position.x - dt * 1.2); W.meshes.elevR.position.x = Math.min(7.29, W.meshes.elevR.position.x + dt * 1.2); }
    if (F.elev === 2 && zone === 'elevator') { F.elev = 3; F.elevT = 0.8; }
    if (F.elev === 3) {
      F.elevT -= dt; W.meshes.elevL.position.x = Math.min(5.96, W.meshes.elevL.position.x + dt * 1.0); W.meshes.elevR.position.x = Math.max(6.64, W.meshes.elevR.position.x - dt * 1.0);
      if (F.elevT <= 0 && W.meshes.elevL.position.x >= 5.95) { W.meshes.elevCol.off = false; if (zone === 'elevator') { g.die('elevator'); return; } F.elev = 0; W.meshes.elevBtn.material.emissiveIntensity = 0; }
    }
    // the stairs that go round once more than they should
    if (l >= 5 && zone === 'stairs' && P.y < 4.62 && P.y > 4.3 && P.x > 11.6 && F.stair < (l >= 7 ? 2 : 1)) { F.stair++; P.y += 6; P.feet = P.y; A.presence(0.25, 2.5); if (F.stair === 1) setTimeout(() => think('Hadn\'t you already passed the third floor?', 3), 2500); }
    // the air conditioner
    if (F.acArmed > 0 && F.acState === 'up') {
      F.acArmed -= dt;
      if ((P.z > -0.3 && Math.abs(P.x) < 1.6 && P.y < 1 && zone !== 'alley') || F.acArmed <= 0) { F.acState = 'falling'; F.acV = 0; }
    }
    if (F.acState === 'falling') {
      const ac = W.meshes.ac; F.acV += 9.8 * dt; ac.position.y -= F.acV * dt; ac.rotation.z += dt * 1.5;
      if (ac.position.y <= 0.42) {
        ac.position.y = 0.42; ac.rotation.set(0.1, 0.3, 0.15); F.acState = 'down';
        if (P.z > -0.25 && P.z < 2.5 && P.x > -1.3 && P.x < 1.7 && P.y < 1.2) { g.die('ac'); return; }
        A.thud(ac.position, 1, 0, 50); A.glass(ac.position, 0.5); g.shake(0.3);
        if (P.z < 0 && P.z > -3) think(g.save.deaths.ac ? 'It came down right where you would have been.' : 'Jesus! That nearly—', 3);
      }
    }
    // the walk signal (it says WALK. The truck doesn't care.)
    const walkNow = Math.floor((t + 4) / 12) % 2 === 0;
    if (walkNow !== walkOn) { walkOn = walkNow; drawWalk(W.meshes.walkNear, walkNow); drawWalk(W.meshes.walkFar, walkNow); }
    if (walkOn && (zone === 'street' || zone === 'road' || zone === 'far') && Math.random() < dt * 4) A.walkChirp(new THREE.Vector3(1.3, 2.6, 3.7));
    // the truck
    if (F.truck === 'idle' && zone === 'street' && P.z > 2.4 && P.x > -14 && P.x < 14) { F.truck = 'armed'; F.truckT = 5.5 + Math.random() * 2; }
    if ((F.truck === 'idle' || F.truck === 'armed') && zone === 'road') { F.truck = 'go'; truck.position.set(P.x - 34, 0, 7); }
    if (F.truck === 'armed' && (F.truckT -= dt) <= 0) { F.truck = 'go'; truck.position.set(-55, 0, 7); }
    if (F.truck === 'go') {
      if (!truck.visible) { truck.visible = true; truckEng = A.engine(truck.position, { freq: 38, vol: 0.25, cutoff: 700 }); }
      truck.position.x += dt * 21; truckEng.set(_v.set(truck.position.x, 1, 7), 1.2);
      if (!F.horn && truck.position.x > P.x - 26 && P.z > 4.5 && P.z < 11) { F.horn = true; A.horn(truck.position, 1.6, true); }
      if (P.z > 5.5 && P.z < 8.5 && P.y < 1 && P.x < truck.position.x + 0.4 && P.x > truck.position.x - 8) { g.die('truck', { truck }); return; }
      if (truck.position.x > 60) { F.truck = 'gone'; truck.visible = false; truckEng.stop(); truckEng = null; if (P.z > 2 && P.z < 13 && Math.abs(P.x) < 20 && !g.save.deaths.truck) think('It didn\'t even slow down. On a red.', 3); }
    }
    // the cars on the far lane: they stop for you
    for (const c of cars) {
      const ahead = P.zone === 'road' && P.z > 8.6 && P.z < 11.6 && P.x < c.position.x - 2 && P.x > c.position.x - 12;
      c.userData.v += ((ahead ? 0 : 9) - c.userData.v) * Math.min(1, dt * (ahead ? 3 : 0.8));
      c.position.x -= c.userData.v * dt; if (c.position.x < -60) c.position.x = 60 + Math.random() * 30;
      if (ahead && !c.userData.honk) { c.userData.honk = true; A.horn(c.position, 0.4); setTimeout(() => (c.userData.honk = false), 3000); }
    }
    // walkers: ordinary people, until they aren't
    for (const w of walkers) {
      if (l >= 4) { // they stop and face the wall. Later they turn to watch you go by.
        w.r.root.rotation.y = l >= 6 ? Math.atan2(P.x - w.r.root.position.x, P.z - w.r.root.position.z) : w.z < 8 ? Math.PI : 0;
        animate(w.r, dt, 0, t); if (l >= 5) pose(w.r, 'wrong', t);
      } else {
        w.x += w.dir * w.sp * dt; if (w.x > w.x1 || w.x < w.x0) w.dir *= -1;
        w.r.root.position.x = w.x; w.r.root.rotation.y = w.dir > 0 ? Math.PI / 2 : -Math.PI / 2; animate(w.r, dt, 1, t);
      }
    }
    // Mrs. Pell
    if (pell.root.visible) {
      if (l >= 6) { pell.root.rotation.y = 0; pell.root.position.z = -7.75; animate(pell, dt, 0, t); pose(pell, 'wrong', t); if (zone === 'hall4' && Math.random() < dt * 0.15) A.whisper(new THREE.Vector3(-5.5, Y4 + 1.5, -7.8), 0, 1.2, 0.12); }
      else { pell.root.rotation.y = Math.atan2(P.x - pell.root.position.x, P.z - pell.root.position.z); animate(pell, dt, 0, t); if (zone === 'hall4' && !F.pellHi && Math.hypot(P.x + 5.5, P.z + 7.3) < 3) { F.pellHi = true; pellTalk(); } }
    }
    // the clerk, the cop
    if (clerk.root.visible && F.robbery !== 'shot') { animate(clerk, dt, 0, t); clerk.neck.rotation.y = Math.max(-0.8, Math.min(0.8, Math.atan2(P.x - 8.6, P.z - 21) - Math.PI)); }
    animate(cop, dt, 0, t, [Math.sin(t * 0.3) * 0.4, 0]);
    // the robbery
    updateRobbery(dt, t);
    // the bus
    if (updateBus(dt, t)) return;
    // he comes for you when the bus is gone
    if (clock >= LATE_AT && !F.lateDone && F.bus !== 'boarded') { F.lateDone = true; g.die('late'); return; }
    // the man with no face
    if (updateHim(dt, t)) return;
    // the mirror: you (and sometimes someone behind you)
    const inBath = zone === 'bath';
    W.meshes.mirror.visible = inBath;
    mirrorMe.root.visible = inBath;
    if (inBath) {
      mirrorMe.root.position.set(P.x, P.y, P.z); mirrorMe.root.rotation.y = P.yaw + Math.PI; animate(mirrorMe, dt, g.moving / 2, t); mirrorMe.head.rotation.x = -P.pitch * 0.7;
      setFaceless(mirrorMe, l >= 5);
      const behind = l >= 4 && F.mirrorHim !== false && (F.mirrorHim = F.mirrorHim ?? Math.random() < 0.6);
      mirrorHim.root.visible = behind && g.looking(-2.92, P.y + 1.6, -0.85, 0.8);
      if (mirrorHim.root.visible) { mirrorHim.root.position.set(P.x + Math.sin(P.yaw) * 0.9, P.y, P.z + Math.cos(P.yaw) * 0.9); mirrorHim.root.rotation.y = P.yaw + Math.PI; animate(mirrorHim, dt, 0, t); if (!F.mirrorSaw) { F.mirrorSaw = true; A.presence(0.4, 3); g.fearSpike(0.8); setTimeout(() => (F.mirrorHim = false), 1400); } }
    } else mirrorHim.root.visible = false;
    // the TV ticker
    if (tvMode !== 'off' && (tvT += dt) > 0.08) { tvT = 0; drawTV(); }
    return false;
  }

  function updateRobbery(dt, t) {
    if (F.robbery === 'coming') {
      F.robT -= dt;
      if (F.robT <= 0) { F.robbery = 'in'; robber.root.visible = true; robber.root.position.set(5.6, 0.15, 15.2); A.bell(new THREE.Vector3(5.6, 2.2, 16)); setDoor(W.doors.get('shop'), true); g.fearSpike(0.5); if (g.save.deaths.robbery && P.zone === 'shop') think('The bell. Get down. Behind the shelves.', 2); }
    } else if (F.robbery === 'in') {
      const r = robber.root; r.position.z += dt * 2.2; r.rotation.y = 0; animate(robber, dt, 1.2, t);
      if (r.position.z >= 17.2) {
        F.robbery = 'aim'; F.robT = 1.1; pose(robber, 'stand'); A.gunshot && say('ROBBER', 'Nobody move! Register, now!', 2.5);
        const head = _v.set(r.position.x, 1.7, r.position.z);
        F.target = P.zone === 'shop' && !(P.crouching && !clearLine(head.x, head.z, P.x, P.z, P.y + 0.8)) ? 'you' : 'clerk';
      }
    } else if (F.robbery === 'aim') {
      const r = robber.root, tx = F.target === 'you' ? P.x : 8.6, tz = F.target === 'you' ? P.z : 21;
      r.rotation.y = Math.atan2(tx - r.position.x, tz - r.position.z); animate(robber, dt, 0, t); pose(robber, 'gun');
      F.robT -= dt;
      if (F.robT <= 0) {
        if (F.target === 'you' && P.zone === 'shop') { g.die('robbery', { robber }); F.robbery = 'done'; return; }
        // he didn't see you. The clerk isn't so lucky.
        A.gunshot(_v.set(r.position.x, 1.5, r.position.z), P.zone === 'shop' ? 1 : 0.4); F.robbery = 'shot';
        clerk.root.rotation.x = -1.4; clerk.root.position.z = 21.35; clerk.root.position.y = 0.3;
        g.gore.spray(_v.set(8.6, 1.4, 21), new THREE.Vector3(0, 0.2, 1), 40, 4); g.gore.pool(new THREE.Vector3(8.6, 0.16, 21.6), 1.1, 0.3);
        F.robT = 1.5; g.fearSpike(1);
        if (P.zone === 'shop') setTimeout(() => think(g.save.deaths.robbery ? 'You let it happen to him instead.' : 'Oh God. Oh God.', 4), 1200);
      }
    } else if (F.robbery === 'shot') {
      F.robT -= dt; const r = robber.root;
      if (F.robT < 0) { r.rotation.y = Math.PI; r.position.z -= dt * 3.5; animate(robber, dt, 2, t); if (r.position.z < 14) { r.visible = false; F.robbery = 'done'; } }
    }
  }

  function updateBus(dt, t) {
    const clock = g.clock;
    if (F.bus === 'away' && clock >= BUS_AT - 0.9) { F.bus = 'arriving'; bus.visible = true; bus.position.set(55, 0, 10.6); busEng = A.engine(bus.position, { freq: 32, vol: 0.22, cutoff: 500 }); }
    if (F.bus === 'arriving') {
      const stopX = -8.2, d = bus.position.x - stopX, v = Math.max(1.2, Math.min(12, d * 0.9));
      bus.position.x -= v * dt; busEng.set(_v.set(bus.position.x, 1, 10.6), 0.8 + v / 20);
      // the push: two hands on your back, as it comes in
      if (d < 16 && d > 2 && P.zone === 'far' && P.z < 12.9 && P.x > -14 && P.x < 2) { g.die('push', { bus }); return true; }
      if (d < 0.2) { F.bus = 'stopped'; A.airBrake(bus.position); F.busT = 0; }
    } else if (F.bus === 'stopped') {
      F.busT += dt; busEng.set(_v.set(bus.position.x, 1, 10.6), 0.7, 0.12);
      if (clock >= BUS_LEAVES) { F.bus = 'leaving'; A.airBrake(bus.position); if (P.zone === 'far' || P.zone === 'road') think('No. No, wait—', 2); }
    } else if (F.bus === 'leaving') {
      F.busV = Math.min(14, (F.busV || 0) + dt * 3); bus.position.x -= F.busV * dt; busEng.set(_v.set(bus.position.x, 1, 10.6), 1 + F.busV / 14);
      if (bus.position.x < -70) { F.bus = 'gone'; bus.visible = false; busEng.stop(); busEng = null; }
    }
    if (bus.visible) { const it = W.inter.find((i) => i.id === 'bus'); it.x = bus.position.x + 0.9; it.z = 11.9; }
    return false;
  }

  // the faceless man. Where he is depends on where you are, and how many times you've woken up.
  const seenFor = (x, y, z, need = 0.9) => g.looking(x, y, z, 0.86) && clearLine(P.x, P.z, x, z, P.y + 1.4) ? (F.lookT += 1 / 60) > need : (F.lookT = 0, false);
  function placeHim(x, y, z, yaw, faceYou = true) { him.root.visible = true; him.root.position.set(x, y, z); him.root.rotation.y = faceYou ? Math.atan2(P.x - x, P.z - z) : yaw; }
  function updateHim(dt, t) {
    const l = L(), zone = P.zone, rem = remembered(g.save);
    let spot = null;
    if (rem && (zone === 'street' || zone === 'road' || zone === 'far')) spot = 'road';
    else if (l >= 6 && g.clock > 14 && !rem) spot = 'stalk';
    else if (zone === 'bed' && g.clock < 0.6 && l >= 6) spot = 'bedroom';
    else if (zone === 'living' && l >= 2 && !F.seen.window) spot = 'window';
    else if (zone === 'hall4' && l >= 3 && !F.seen.hall) spot = 'hall';
    else if (zone === 'stairs' && l >= 4 && !F.seen.stairs) spot = 'stairs';
    else if ((zone === 'far' || zone === 'road' || zone === 'street') && F.bus !== 'gone' && F.bus !== 'leaving') spot = 'stop';
    F.himSpot = spot;
    if (!spot) { him.root.visible = false; return false; }
    if (spot === 'window') { placeHim(2.1, 12.45, 16.0, Math.PI, false); animate(him, dt, 0, t); if (seenFor(2.1, 13.9, 16, 2.2)) { F.seen.window = true; W.meshes.oppWindow.material.emissiveIntensity = 0.1; A.presence(0.2, 2); } }
    else if (spot === 'bedroom') { placeHim(-7.55, Y4, -5.55, 0); animate(him, dt, 0, t); pose(him, 'wrong', t); }
    else if (spot === 'hall') { placeHim(-7.3, Y4, -7.0, 0); animate(him, dt, 0, t); if (seenFor(-7.3, Y4 + 1.7, -7, 1.2) || Math.hypot(P.x + 7.3, P.z + 7) < 4.5) { F.seen.hall = true; him.root.visible = false; A.presence(0.35, 2.5); g.fearSpike(0.7); W.meshes.fixLight?.(); } }
    else if (spot === 'stairs') {
      // two flights below you, looking up
      const fy = Math.floor((P.y + 0.1) / 3) * 3 - 3;
      if (fy >= 0) { placeHim(8.9, fy, -6.2, 0); animate(him, dt, 0, t); him.head.rotation.x = -0.7; if (seenFor(8.9, fy + 1.7, -6.2, 0.8)) { F.seen.stairs = true; him.root.visible = false; A.presence(0.35, 2.5); g.fearSpike(0.8); } }
      else him.root.visible = false;
    } else if (spot === 'stop') {
      // at the bus stop, back to the street. Wearing a hat, the first few times.
      if (F.bus === 'arriving' || F.bus === 'stopped') { placeHim(P.x - Math.sin(P.yaw) * -0.0 + 0, 0.15, Math.max(13.4, P.z + 0.9), 0); him.root.rotation.y = Math.PI; him.root.visible = !g.looking(him.root.position.x, 1.6, him.root.position.z, 0.3); }
      else { placeHim(-5, 0.15, 14.9, Math.PI, false); }
      animate(him, dt, 0, t);
    } else if (spot === 'road') {
      placeHim(3, 0, 8.6, 0); animate(him, dt, 0, t); himInter.x = 3; himInter.y = 1.6; himInter.z = 8.6;
      if (!F.roadSeen && g.looking(3, 1.6, 8.6, 0.9)) { F.roadSeen = true; A.presence(0.3, 4); think('He\'s waiting for you. In the road. Where you left him.', 5); }
    } else if (spot === 'stalk') {
      // he walks your path, but only while you aren't looking
      F.trailT -= dt;
      if (F.trailT <= 0) { F.trailT = 0.4; const last = F.trail[F.trail.length - 1]; if (!last || Math.hypot(last.x - P.x, last.y - P.y, last.z - P.z) > 0.35) F.trail.push({ x: P.x, y: P.y, z: P.z }); }
      if (F.stalkGone > 0) { F.stalkGone -= dt; him.root.visible = false; return false; }
      if (F.trail.length < 12) { him.root.visible = false; return false; }
      if (F.stalkI === 0) F.stalkI = Math.max(1, F.trail.length - 12);
      const p = F.trail[Math.min(F.trail.length - 1, Math.floor(F.stalkI))];
      const d = Math.hypot(p.x - P.x, p.z - P.z) + Math.abs(p.y - P.y) * 2;
      const seen = g.looking(p.x, p.y + 1.6, p.z, 0.7) && d < 28;
      if (!seen) F.stalkI = Math.min(F.trail.length - 1, F.stalkI + dt * (l >= 8 ? 2.6 : l >= 7 ? 1.9 : 1.4) / 0.4 * 0.5);
      placeHim(p.x, p.y, p.z, 0); animate(him, dt, 0, t);
      if (seen && d < 9) { F.stareT = (F.stareT || 0) + dt; if (F.stareT > 2.2) { F.stareT = 0; F.stalkGone = 12; F.stalkI = Math.max(1, F.stalkI - 25); A.presence(0.3, 2); g.fearSpike(0.6); } } else F.stareT = 0;
      if (!F.stalkWarned && seen) { F.stalkWarned = true; A.presence(0.4, 3); g.fearSpike(0.9); if (!g.save.deaths.him) think('He\'s following you. He doesn\'t move. Not while you\'re watching.', 5); }
      g.himNear = Math.max(0, 1 - d / 12);
      if (d < 0.85) { g.die('him', { him }); return true; }
    }
    return false;
  }

  // what to do next, from what Owen knows
  function objective() {
    const s = g.save, d = s.deaths, out = [];
    if (remembered(s)) return { main: 'Find him. Say his name.', sub: ['He is in the road, where you left him.', 'Or catch the bus, and keep running.'] };
    if (d.gas && !F.gasOff) out.push('Turn off the gas: the valve under the kitchen sink.');
    if (!F.dressed) out.push('Get dressed.');
    if (d.elevator && P.y > 11) out.push('Take the stairs.');
    if (d.ac && P.y < 3 && P.z < 0) out.push('Not the front steps: wait for it to fall, or use the back door.');
    if (d.truck && F.truck !== 'gone' && !['far', 'shop'].includes(P.zone)) out.push('Wait at the curb for the truck.');
    if (!F.pass && !F.ticket) out.push(d.robbery ? 'Your bus pass is in your car (keys in the bowl).' : 'You need a ticket or your bus pass.');
    if (d.push && F.bus !== 'stopped') out.push('Stand back from the curb.');
    const clues = Object.keys(s.clues).length;
    if (s.loop >= 3 && clues < 4) out.push(`What happened last night? (${clues}/4 remembered)`);
    return { main: F.bus === 'stopped' ? 'Get on the bus.' : 'Catch the 7:40 bus.', sub: out.slice(0, 4) };
  }

  return { start, update, I, door, objective, him, bus, truck, robber, clerk, get F() { return F; }, stopSounds() { hiss?.stop(); hiss = null; radio?.stop(); radio = null; busEng?.stop(); busEng = null; truckEng?.stop(); truckEng = null; } };
}
