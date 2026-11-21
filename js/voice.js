// Spoken lines go through the browser's own text to speech, each character pitched and paced their own way.
// HIM is slowed and dropped so it sounds wrong. Subtitles always show the words too.
const S = typeof speechSynthesis !== 'undefined' ? speechSynthesis : null;
const CAST = {
  OWEN: { pitch: 0.85, rate: 0.95, prefer: [/guy.*natural|andrew.*natural|christopher.*natural/i, /google uk english male|daniel|alex/i, /david|mark|male/i] },
  DANA: { pitch: 1.1, rate: 1.0, prefer: [/jenny.*natural|aria.*natural|michelle.*natural/i, /google us english|samantha|zira/i, /female|zira/i] },
  NEWS: { pitch: 1.0, rate: 1.05, prefer: [/aria.*natural|jenny.*natural/i, /google us english|zira|samantha/i, /female/i] },
  RADIO: { pitch: 1.15, rate: 1.1, prefer: [/guy.*natural|davis.*natural/i, /google us english|david/i, /male/i] },
  PELL: { pitch: 1.3, rate: 0.85, prefer: [/ana.*natural|sonia.*natural/i, /google uk english female|hazel|susan/i, /female|zira/i] },
  CLERK: { pitch: 1.0, rate: 1.05, prefer: [/davis.*natural|guy.*natural/i, /google us english|mark/i, /male|david/i] },
  ROBBER: { pitch: 0.7, rate: 1.2, prefer: [/christopher.*natural|eric.*natural/i, /google uk english male|david/i, /male/i] },
  DRIVER: { pitch: 0.8, rate: 0.95, prefer: [/roger.*natural|guy.*natural/i, /google uk english male|mark/i, /male|david/i] },
  COP: { pitch: 0.9, rate: 0.95, prefer: [/eric.*natural|guy.*natural/i, /google us english|david/i, /male/i] },
  HIM: { pitch: 0.3, rate: 0.55, prefer: [/christopher.*natural|guy.*natural/i, /google uk english male|daniel/i, /male|david/i] },
};
let voices = [], picked = {};
function load() {
  if (!S) return;
  voices = S.getVoices().filter((v) => /^en/i.test(v.lang));
  picked = {};
  for (const [who, c] of Object.entries(CAST)) { let v = null; for (const re of c.prefer) { v = voices.find((x) => re.test(x.name)); if (v) break; } picked[who] = v || voices[0] || null; }
}
if (S) { load(); S.addEventListener?.('voiceschanged', load); }
export const voice = {
  on: true, vol: 0.9,
  say(who, text, onend) {
    if (!S || !this.on || this.vol <= 0) { onend?.(); return null; }
    if (!voices.length) load();
    const c = CAST[who] || CAST.OWEN, u = new SpeechSynthesisUtterance(text);
    const v = picked[who]; if (v) { u.voice = v; u.lang = v.lang; }
    u.pitch = c.pitch; u.rate = c.rate; u.volume = Math.min(1, this.vol);
    let done = false; const end = () => { if (!done) { done = true; onend?.(); } };
    u.onend = end; u.onerror = end;
    try { S.resume(); S.speak(u); } catch { end(); }
    return u;
  },
  get busy() { return !!S?.speaking; },
  cancel() { try { S?.cancel(); } catch { /* fine */ } },
  pause() { try { S?.pause(); } catch { /* fine */ } },
  resume() { try { S?.resume(); } catch { /* fine */ } },
};
