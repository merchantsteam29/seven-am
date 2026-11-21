// Renders icons/icon.svg to the PNG sizes the app manifest needs, and cover.png (the street from Owen's window).
import { open, sleep } from './harness.mjs';
import { spawn } from 'child_process';
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = 8600 + Math.floor(Math.random() * 300);
const srv = spawn(process.execPath, ['serve.js'], { cwd: root, env: { ...process.env, PORT: port }, stdio: 'ignore' });
process.env.SH_URL = `http://localhost:${port}/`;
await sleep(600);
const { ev, send, done } = await open(import.meta.url, { size: [1280, 720] });
await sleep(5000);
const svg = fs.readFileSync(path.join(root, 'icons/icon.svg'), 'utf8');
const png = async (file, size, pad = 0, bleed = false) => {
  await send('Emulation.setDeviceMetricsOverride', { width: size, height: size, deviceScaleFactor: 1, mobile: false });
  await ev(`document.body.innerHTML = ''; document.body.style.cssText = 'margin:0;background:${bleed ? '#0a0505' : 'transparent'}'; const d = document.createElement('div'); d.style.cssText = 'width:${size}px;height:${size}px;display:grid;place-items:center'; d.innerHTML = ${JSON.stringify(svg)}; const s = d.firstElementChild; s.setAttribute('width', ${size - pad * 2}); s.setAttribute('height', ${size - pad * 2}); document.body.appendChild(d);`);
  await send('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } });
  await sleep(300);
  const r = await send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: size, height: size, scale: 1 } });
  fs.writeFileSync(path.join(root, file), Buffer.from(r.result.data, 'base64'));
};
// cover: morning 6, the man across the street in the window, the clock
await ev(`localStorage.clear(); document.getElementById('warnOk').click(); __s.setQuality('high')`); await sleep(800);
await ev(`document.getElementById('btnNew').click()`);
for (let i = 0; i < 80 && (await ev('return __s.mode')) !== 'play'; i++) await sleep(250);
await ev(`__s.save.loop = 6; __s.beginLoop()`);
for (let i = 0; i < 80 && (await ev('return __s.mode')) !== 'play'; i++) await sleep(250);
await ev(`Object.assign(__s.save.clues, { shirt: true, dana: true, car: true, name: true }); __s.day.F.truck = 'gone'; __s.tp(3.4, 0.15, 2.4, Math.PI + 0.05, 0.04); document.getElementById('hud').hidden = true;`);
await sleep(4000);
const c = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path.join(root, 'cover.png'), Buffer.from(c.result.data, 'base64'));
await send('Page.navigate', { url: 'about:blank' }); await sleep(800);
await png('icons/icon-512.png', 512); await png('icons/icon-192.png', 192); await png('icons/apple-touch-icon.png', 180, 0, true); await png('icons/maskable-512.png', 512, 60, true);
srv.kill(); await done();
