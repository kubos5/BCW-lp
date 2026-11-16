// Screenshot della demo di BCW-web con Chrome headless (Chrome DevTools Protocol, senza dipendenze).
// Uso, con BCW-web avviata (PORT=8091 node server.js):
//   node tools/webshot.mjs http://localhost:8091/ l-dashboard.png 1440 900 0
//   node tools/webshot.mjs http://localhost:8091/ d-grades.png 1440 900 1 /grades
// Argomenti: <url> <out.png> <larghezza> <altezza> <scuro:0|1> [percorso dopo #] [densità, 2 di serie].
import { spawn } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const [url, out, w, h, dark, hash = '', scale = '2'] = process.argv.slice(2);
const port = 9300 + Math.floor(Math.random() * 500);
const profile = mkdtempSync(join(tmpdir(), 'bcwshot-'));
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
  '--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--hide-scrollbars',
  '--no-first-run', '--no-default-browser-check', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let target;
for (let i = 0; i < 50; i++) {
  try { const list = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); target = list.find((t) => t.type === 'page'); if (target) break; } catch {}
  await sleep(200);
}
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r));
let id = 0; const pending = new Map();
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: +w, height: +h, deviceScaleFactor: +scale, mobile: +w < 700 });
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: dark === '1' ? 'dark' : 'light' }] });
await send('Page.navigate', { url });
await sleep(1500);
await send('Runtime.evaluate', { expression: `localStorage.setItem('bcw.demoMode','true'); localStorage.setItem('bcw.onboardingCompleted','1'); true` });
await send('Page.navigate', { url: url + (hash ? '#' + hash : '') });
await sleep(6000);
const shot = await send('Page.captureScreenshot', { format: 'png' });
writeFileSync(out, Buffer.from(shot.result.data, 'base64'));
console.log('OK', out);
ws.close(); chrome.kill();
process.exit(0);
