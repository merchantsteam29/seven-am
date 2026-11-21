// Frame cost in each area: draw calls, triangles, JS update ms, render ms (render ms is CPU+swiftshader, only compare relatively)
import { open, sleep } from './harness.mjs';
import { spawn } from 'child_process';
import path from 'path'; import { fileURLToPath } from 'url';
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = 8600 + Math.floor(Math.random() * 300);
const srv = spawn(process.execPath, ['serve.js'], { cwd: root, env: { ...process.env, PORT: port }, stdio: 'ignore' });
process.env.SH_URL = `http://localhost:${port}/`;
await sleep(600);
const { ev, done } = await open(import.meta.url, { size: [960, 540] });
await sleep(5000);
await ev(`localStorage.clear(); document.getElementById('warnOk').click(); __s.setQuality('${process.argv[2] || 'medium'}'); document.getElementById('btnNew').click()`);
for (let i = 0; i < 80 && (await ev('return __s.mode')) !== 'play'; i++) await sleep(250);
const Y = 12;
const views = [['title-ish living', 3.2, Y, -1.4, Math.PI + 0.1, 0], ['bedroom', -4, Y, -1.5, 2.2, 0], ['bath', -1.0, Y, -1.2, -Math.PI / 2 + 0.3, 0], ['hall', 4, Y, -7, Math.PI / 2, 0], ['stairs', 9, Y, -7, -Math.PI / 2, -0.4], ['lobby', 4, 0, -2, Math.PI / 2 + 0.5, 0], ['street', 2, 0.15, 2, Math.PI, 0], ['street-long', -20, 0.15, 2, -Math.PI / 2, 0], ['shop', 4.5, 0.15, 19.8, -Math.PI / 2 - 0.4, 0]];
for (const [n, x, y, z, yaw, p] of views) {
  await ev(`__s.tp(${x}, ${y}, ${z}, ${yaw}, ${p}); __s.clock = 2;`); await sleep(1500); await ev('__s.prof()'); await sleep(2500);
  const pr = await ev('return __s.prof()'), st = await ev('return __s.stats()');
  console.log(n.padEnd(18), 'calls/frame', pr.calls, 'tris', st.tris, 'upd', pr.upd, 'ren', pr.ren, 'fps~', (pr.n / 2.5).toFixed(0));
}
console.log(JSON.stringify(await ev('return __s.stats()')));
srv.kill(); await done();
