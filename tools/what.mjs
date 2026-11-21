// Which kinds of objects still cost draw calls
import { open, sleep } from './harness.mjs';
import { spawn } from 'child_process';
import path from 'path'; import { fileURLToPath } from 'url';
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = 8600 + Math.floor(Math.random() * 300);
const srv = spawn(process.execPath, ['serve.js'], { cwd: root, env: { ...process.env, PORT: port }, stdio: 'ignore' });
process.env.SH_URL = `http://localhost:${port}/`;
await sleep(600);
const { ev, done } = await open(import.meta.url, { size: [640, 360] });
await sleep(5000);
await ev(`document.getElementById('warnOk').click(); document.getElementById('btnNew').click()`);
for (let i = 0; i < 80 && (await ev('return __s.mode')) !== 'play'; i++) await sleep(250);
console.log(await ev(`
  const out = {}; const vis = (o) => { for (; o; o = o.parent) if (!o.visible) return false; return true; };
  __s.scene.traverse((o) => { if (!o.isMesh || !vis(o)) return;
    let top = o; while (top.parent && top.parent !== __s.scene) top = top.parent;
    const k = o.isSkinnedMesh ? 'skinned' : o.isInstancedMesh ? 'instanced' : !o.matrixAutoUpdate && top === o ? 'merged/static' : top !== o ? 'in group: ' + (top.type) + (top.children.length > 6 ? ' (big)' : '') : 'loose ' + o.geometry.type + (o.material.map ? ' tex' : '');
    out[k] = (out[k] || 0) + 1; });
  return JSON.stringify(out, null, 1);`));
srv.kill(); await done();
