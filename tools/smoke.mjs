// Boots the game, starts a morning, looks around every area, prints draw-call stats, fails on any console error.
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
check(await ev(`return document.body.dataset.ready`) === '1', 'booted');
await shot('01-warn');
await ev(`document.getElementById('warnOk').click()`); await sleep(2500); await shot('02-title');
await ev(`__s.setQuality('medium'); document.getElementById('btnNew').click()`);
for (let i = 0; i < 60 && (await ev(`return __s.mode`)) !== 'play'; i++) await sleep(250);
check((await ev(`return __s.mode`)) === 'play', 'playing');
await shot('03-wake');
const Y = 12;
const views = [
  ['bedroom', -4.0, Y, -1.5, Math.PI / 2 + 0.6, -0.1], ['bed-desk', -4.5, Y, -3.5, 1.9, -0.2], ['bath', -1.0, Y, -1.2, -Math.PI / 2 + 0.3, 0], ['entry', -1.5, Y, -3.6, 0, 0],
  ['living', 0.8, Y, -1.0, -2.2, -0.05], ['kitchen', 2.5, Y, -3.5, 0, -0.2], ['window', 3.0, Y, -1.2, Math.PI + 0.1, 0.05],
  ['hall', 4, Y, -7, Math.PI / 2, 0], ['hall-elev', 3, Y, -7, -0.6, 0], ['stairs', 9, Y, -7, -Math.PI / 2, -0.4], ['stairs-mid', 12, 10.5, -6, Math.PI / 2, -0.3],
  ['lobby', 4, 0, -2, Math.PI / 2 + 0.5, 0], ['laundry', -5, 0, -4, Math.PI / 2, 0], ['alley', -9.5, 0, -6, Math.PI, 0],
  ['street', 2, 0.15, 2, Math.PI, 0], ['street-car', -8, 0.15, 3, Math.PI / 2 + 0.4, -0.1], ['road', 3, 0, 8, -Math.PI / 2, 0], ['busstop', -1, 0.15, 13.5, Math.PI / 2, 0],
  ['shop', 5.6, 0.15, 17, Math.PI + 0.6, 0], ['shop-in', 4.5, 0.15, 19.8, -Math.PI / 2 - 0.4, -0.1], ['up-at-building', 0, 0.15, 10, 0, 0.5],
];
for (const [n, x, y, z, yaw, pitch] of views) {
  await ev(`__s.tp(${x}, ${y}, ${z}, ${yaw}, ${pitch}); __s.clock = 2;`);
  await sleep(900); await shot('v-' + n);
}
console.log(JSON.stringify(await ev(`return __s.stats()`)));
console.log(await ev(`return JSON.stringify({ mode: __s.mode, zone: __s.P.zone, inter: __s.W.inter.length, colliders: __s.W.colliders.length })`));
srv.kill();
await done();
