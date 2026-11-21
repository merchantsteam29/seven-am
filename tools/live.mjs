// Boots the published site and starts a morning: node tools/live.mjs
import { open, sleep } from './harness.mjs';
process.env.SH_URL = 'https://merchantsteam29.github.io/seven-am/';
const { ev, check, done } = await open(import.meta.url);
await sleep(8000);
check(await ev('return document.body.dataset.ready') === '1', 'booted');
await ev(`document.getElementById('warnOk').click(); document.getElementById('btnNew').click()`);
for (let i = 0; i < 80 && (await ev('return __s.mode')) !== 'play'; i++) await sleep(250);
check(await ev('return __s.mode') === 'play', 'playing');
await done();
