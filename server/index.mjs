import { createServer } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Store } from './store.mjs';
import { getRailStatus, synthesizeVoice } from './rails.mjs';
import { conversationalReply } from './planner.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
if (existsSync(resolve(root, '.env'))) process.loadEnvFile(resolve(root, '.env'));
const port = Number(process.env.PORT || 4317);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Use a PORT from 1024 to 65535.');
const store = new Store(process.env.KSN_DB_PATH || resolve(root, 'data/kal-se-nahi.sqlite'));
const production = process.argv.includes('--production');
let vite;
let lastVoiceAt = 0;
let voicePending = false;
let conversationPending = false;
const decorate = state => ({ ...state, rails: getRailStatus(), planner: process.env.OLLAMA_MODEL ? 'Local rules + optional Ollama conversation' : 'Local rule-based agent' });
function json(res, status, data) { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }); res.end(JSON.stringify(data)); }
async function body(req) {
  if (!req.headers['content-type']?.startsWith('application/json')) { const e = new Error('Use application/json.'); e.statusCode = 415; throw e; }
  const chunks = []; let size = 0;
  for await (const chunk of req) { size += chunk.length; if (size > 16384) { const e = new Error('Request too large.'); e.statusCode = 413; throw e; } chunks.push(chunk); }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { const e = new Error('Invalid JSON.'); e.statusCode = 400; throw e; }
}
function localRequest(req) {
  const allowed = new Set([`127.0.0.1:${port}`, `localhost:${port}`]);
  // The server itself is bound to 127.0.0.1, which is the actual network
  // boundary. Embedded browsers may label a loopback navigation as
  // cross-site or rewrite Origin, so those advisory headers cannot safely
  // decide whether the local app may load.
  return allowed.has(req.headers.host);
}
const server = createServer(async (req, res) => {
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (!localRequest(req)) return json(res, 403, { error: 'This app only accepts same-origin requests on localhost.' });
  const url = new URL(req.url, `http://127.0.0.1:${port}`);
  try {
    if (url.pathname.startsWith('/api/')) {
      if (req.method === 'GET' && url.pathname === '/api/state') return json(res, 200, decorate(store.read()));
      if (req.method === 'GET' && url.pathname === '/api/rails') return json(res, 200, getRailStatus());
      if (req.method === 'GET' && url.pathname === '/api/health') return json(res, 200, { ok: true, mode: 'local-demo' });
      if (req.method === 'GET' && url.pathname === '/api/export') {
        const s = store.read();
        res.setHeader('Content-Disposition', 'attachment; filename="kal-se-nahi-demo-audit.json"');
        return json(res, 200, { product: 'Kal Se Nahi', environment: 'demo', exportedAt: new Date().toISOString(), note: 'All financial, calendar, booking and attendance events are simulated. Conversation text and personal agreement fields excluded.', audit: s.audit, receipts: s.receipts });
      }
      if (req.method === 'POST' && url.pathname === '/api/command') {
        const command = await body(req);
        const previous = store.read();
        const next = store.execute(command);
        // Conversation only; decisions and financial side effects already ran through policy.
        const last = next.messages.at(-1);
        if (command.type === 'CHAT' && last?.source === 'conversation' && !previous.messages.some(m => m.id === last.id) && !conversationPending) {
          conversationPending = true;
          try { const reply = await conversationalReply(command.message, next); if (reply) store.updateReply(last.id, reply); }
          finally { conversationPending = false; }
        }
        return json(res, 200, decorate(store.read()));
      }
      if (req.method === 'POST' && url.pathname === '/api/voice') {
        const input = await body(req);
        const s = store.read(); const message = s.messages.find(m => m.id === input.messageId && m.role === 'agent');
        if (!message) return json(res, 400, { error: 'Choose a saved agent reply to read aloud.' });
        if (voicePending || Date.now() - lastVoiceAt < 3000) return json(res, 429, { error: 'Wait for the current voice request before trying again.' });
        voicePending = true; lastVoiceAt = Date.now();
        try {
          const audio = await synthesizeVoice(message.text, input.language || s.charter.language);
          res.writeHead(200, { 'Content-Type': audio.contentType, 'Cache-Control': 'no-store', 'Content-Length': audio.audio.length });
          res.end(audio.audio);
        } finally { voicePending = false; }
        return;
      }
      return json(res, 404, { error: 'Unknown API route.' });
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') return json(res, 405, { error: 'Method not allowed.' });
    if (!production) return vite.middlewares(req, res, () => json(res, 404, { error: 'Page not found.' }));
    const dist = resolve(root, 'dist');
    const pathname = decodeURIComponent(url.pathname);
    let file = resolve(dist, '.' + pathname);
    if (!file.startsWith(dist + sep) && file !== dist) return json(res, 403, { error: 'Invalid path.' });
    if (!extname(file)) file = resolve(dist, 'index.html');
    if (!existsSync(file)) return json(res, 404, { error: 'File not found.' });
    const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' };
    res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'Cache-Control': extname(file) === '.html' ? 'no-cache' : 'public,max-age=3600' });
    res.end(req.method === 'HEAD' ? undefined : readFileSync(file));
  } catch (error) {
    const status = error.statusCode || 500;
    if (status === 500) console.error('Request failed:', error.name);
    if (!res.headersSent) json(res, status, { error: status === 500 ? 'Something went wrong. Your saved agreement is still available.' : error.message });
  }
});
if (!production) {
  const { createServer: createViteServer } = await import('vite');
  vite = await createViteServer({ root, appType: 'spa', server: { middlewareMode: true, hmr: { server }, allowedHosts: ['localhost','127.0.0.1'] } });
} else if (!existsSync(resolve(root, 'dist/index.html'))) throw new Error('Run npm run build before npm start.');
server.listen(port, '127.0.0.1', () => console.log(`Kal Se Nahi is ready at http://127.0.0.1:${port} — local demo, no live payments.`));
async function stop() { await vite?.close(); server.close(() => { store.close(); process.exit(0); }); }
process.on('SIGTERM', stop); process.on('SIGINT', stop);
