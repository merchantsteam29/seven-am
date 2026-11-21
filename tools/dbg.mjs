// Debug one death: node tools/dbg.mjs <kind>  (gas by default). Prints phase over time and any errors.
import { open, sleep } from './harness.mjs';
import { spawn } from 'child_process';
import path from 'path'; import { fileURLToPath } from 'url';
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = 8600 + Math.floor(Math.random() * 300);
const srv = spawn(process.execPath, ['serve.js'], { cwd: root, env: { ...process.env, PORT: port }, stdio: 'ignore' });
process.env.SH_URL = `http://localhost:${port}/`;
await sleep(600);
const { ev, shot, done } = await open(import.meta.url);
await sleep(5000);
await ev(`localStorage.clear(); document.getElementById('warnOk').click(); __s.setQuality('low'); __s.setGore('full'); document.getElementById('btnNew').click()`);
for (let i = 0; i < 80 && (await ev('return __s.mode')) !== 'play'; i++) await sleep(200);
const kind = process.argv[2] || 'gas';
await ev(`__s.g.die('${kind}', {})`);
for (let i = 0; i < 40; i++) {
  const s = await ev(`return JSON.stringify({ m: __s.mode, ph: __s.deaths.phase, t: +__s.deaths.t.toFixed(2), black: +__s.U.black.value.toFixed(2) })`);
  console.log(s);
  if (s.includes('"ph":"tp"') && JSON.parse(s).t > 1.5) { await shot('tp-' + kind); break; }
  await sleep(400);
}
srv.kill(); await done();
