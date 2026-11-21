// Morning 8: he walks your path while you aren't looking, stops when you look, and takes your face if he reaches you.
import { open, sleep } from './harness.mjs';
import { spawn } from 'child_process';
import path from 'path'; import { fileURLToPath } from 'url';
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = 8600 + Math.floor(Math.random() * 300);
const srv = spawn(process.execPath, ['serve.js'], { cwd: root, env: { ...process.env, PORT: port }, stdio: 'ignore' });
process.env.SH_URL = `http://localhost:${port}/`;
await sleep(600);
const { ev, shot, check, done } = await open(import.meta.url);
await sleep(5000);
await ev(`localStorage.clear(); document.getElementById('warnOk').click(); __s.setQuality('low'); __s.setGore('full'); document.getElementById('btnNew').click()`);
for (let i = 0; i < 80 && (await ev('return __s.mode')) !== 'play'; i++) await sleep(200);
await ev(`__s.save.loop = 8; __s.beginLoop()`);
for (let i = 0; i < 80 && (await ev('return __s.mode')) !== 'play'; i++) await sleep(200);
await ev(`__s.use('valve'); __s.use('wardrobe'); __s.day.F.truck = 'gone';`);
for (let i = 0; i < 40; i++) { await ev(`__s.tp(${-20 + i * 0.5}, 0.15, 2, -Math.PI / 2, 0); __s.clock = 16;`); await sleep(450); }
// look back at him: he must not move
await ev(`__s.tp(0, 0.15, 2, Math.PI / 2, 0)`); await sleep(600);
const a = await ev('return __s.day.F.stalkI'); await sleep(1500); const b = await ev('return __s.day.F.stalkI');
console.log(await ev('return JSON.stringify({ spot: __s.day.F.himSpot, trail: __s.day.F.trail.length, loop: __s.save.loop, clock: __s.clock, gone: __s.day.F.stalkGone, mode: __s.mode, zone: __s.P.zone })')); console.log('watching: index', a, '->', b, 'visible', await ev('return __s.day.him.root.visible'));
check(Math.abs(b - a) < 0.5, 'he stays still while watched');
await shot('watching');
// turn away
await ev(`__s.tp(0, 0.15, 2, -Math.PI / 2, 0)`);
const t0 = Date.now(); let m;
while (Date.now() - t0 < 40000 && (m = await ev('return __s.mode')) === 'play') await sleep(200);
check(m === 'dying', 'he reached you: ' + m);
for (let i = 0; i < 200 && !(await ev('return __s.deaths.phase === "tp" && __s.deaths.t > 2')); i++) await sleep(100);
await shot('faceless');
srv.kill(); await done();
