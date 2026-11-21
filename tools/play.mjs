// Plays through every death (gore on Full, a screenshot in the middle of each) and the endings.
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
const mode = () => ev('return __s.mode');
const waitMode = async (m, ms = 30000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if ((await mode()) === m) return true; await sleep(150); } return false; };
await ev(`localStorage.clear(); document.getElementById('warnOk').click(); __s.setQuality('low'); __s.setGore('full'); document.getElementById('btnNew').click()`);
check(await waitMode('play'), 'first morning');
const Y = 12;
// one death: set it up, wait for the gore shot, check what killed you, wake up
async function death(name, setup, expect) {
  await ev(setup);
  const t0 = Date.now(); let m;
  while (Date.now() - t0 < 15000 && (m = await mode()) === 'play') await sleep(100);
  check(m === 'dying', `${name}: dying (got ${m})`);
  for (let i = 0; i < 200 && !(await ev('return __s.deaths.phase === "tp" && __s.deaths.t > 1.6')); i++) await sleep(100);
  await shot('d-' + name);
  check(await waitMode('dead', 40000), `${name}: death screen`);
  await shot('d-' + name + '-screen');
  const k = await ev('return Object.keys(__s.save.deaths).join(",")');
  check(k.includes(expect), `${name}: recorded as ${expect} (have ${k})`);
  await ev(`document.getElementById('btnWake').click()`);
  check(await waitMode('play'), `${name}: next morning`);
}
// 1. coffee
await death('gas', `__s.use('stove')`, 'gas');
// 2. the elevator (after turning the gas off, getting dressed, picking things up, remembering)
await ev(`for (const id of ['valve','wardrobe','dresser','keys','shirt']) __s.use(id); __s.save.clues.dana = true;`);
check(await ev('return __s.day.F.gasOff && __s.day.F.dressed && __s.day.F.wallet && __s.day.F.keys'), 'morning chores');
await ev(`__s.use('tv')`); await sleep(7000); check(await ev('return !!__s.save.clues.name'), 'news gave the name');
await ev(`__s.use('elevButton')`); await sleep(2600);
await death('elevator', `__s.tp(6.3, ${Y}, -9.0, 0, 0)`, 'elevator');
// 3. the front steps
await ev(`__s.use('valve'); __s.use('wardrobe'); __s.tp(0, 0, -1.2, Math.PI, 0); __s.door('front0', true); __s.day.F.acArmed = 5;`);
await death('ac', `__s.tp(0, 0, 0.6, Math.PI, 0)`, 'ac');
// 4. the crossing
await ev(`__s.use('valve'); __s.use('wardrobe'); __s.tp(3, 0.15, 3.0, Math.PI, 0)`); await sleep(400);
await death('truck', `__s.tp(3, 0, 6.8, Math.PI, 0)`, 'truck');
// 5. the shop
await ev(`__s.use('valve'); __s.use('wardrobe'); __s.use('dresser'); __s.tp(8.6, 0.15, 19.0, Math.PI, 0); __s.day.F.truck = 'gone'`);
await death('robbery', `__s.use('counter')`, 'robbery');
// 6. the bus stop
await ev(`__s.use('valve'); __s.use('wardrobe'); __s.use('keys'); __s.tp(-12.5, 0.15, 3.0, Math.PI, 0); __s.use('glovebox'); __s.day.F.truck = 'gone'`);
check(await ev('return __s.day.F.pass'), 'bus pass from the glovebox');
await ev(`__s.tp(-4, 0.15, 12.4, 0, 0); __s.clock = 36.9`);
await death('push', `0`, 'push');
// 7. late
await ev(`__s.use('valve'); __s.use('wardrobe'); __s.day.F.truck = 'gone'; __s.day.F.bus = 'gone'; __s.tp(2, 0.15, 2, Math.PI, 0)`);
await death('late', `__s.clock = 42.6`, 'late');
// 8. him (morning 8: he walks your path while you aren't looking)
await ev(`__s.use('valve'); __s.use('wardrobe'); __s.day.F.truck = 'gone';`);
for (let i = 0; i < 40; i++) await ev(`__s.tp(${-20 + i * 0.5}, 0.15, 2, -Math.PI / 2, 0); __s.clock = 16;`).then(() => sleep(120));
await ev(`__s.tp(0, 0.15, 2, -Math.PI / 2, 0)`); // facing away from him
await death('him', `0`, 'him');
await shot('morning-9');
// the bus ending: board it
await ev(`__s.save.clues = {}; __s.day.F.pass = true; __s.tp(-4, 0.15, 14.6, 0, 0); __s.clock = 37.0; __s.day.F.truck = 'gone'`);
for (let i = 0; i < 80 && (await ev('return __s.day.F.bus')) !== 'stopped'; i++) await sleep(250);
check((await ev('return __s.day.F.bus')) === 'stopped', 'bus stopped');
await shot('bus-stopped');
await ev(`__s.use('bus')`);
check(await waitMode('ending', 12000), 'bus ending');
await sleep(4000); await shot('end-bus');
// the true ending
await ev(`document.getElementById('btnEndTitle').click(); document.getElementById('btnNew').click()`);
check(await waitMode('play'), 'new game after ending');
await ev(`Object.assign(__s.save.clues, { shirt: true, dana: true, car: true, name: true }); __s.tp(3, 0.15, 3.0, Math.PI, 0); __s.day.F.truck = 'gone'`);
await sleep(800); await shot('him-in-road');
await ev(`__s.tp(3, 0, 7.4, Math.PI, 0)`); await sleep(500);
check((await ev('return __s.focus()')) === 'Say his name', 'say his name prompt: ' + (await ev('return __s.focus()')));
await ev(`__s.use('him')`);
check(await waitMode('ending', 12000), 'true ending');
await sleep(9000); await shot('end-name');
console.log(await ev('return JSON.stringify(__s.progress)'));
srv.kill();
await done();
