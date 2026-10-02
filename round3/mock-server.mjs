import { createServer } from 'node:http';
import { handleMockRequest } from './mock-core.mjs';

const port = Number(process.env.PORT || 8787);
const host = process.env.HOST || '0.0.0.0';

async function readJson(req) {
  if (req.method === 'GET' || req.method === 'HEAD') return null;
  const chunks = []; let total = 0;
  for await (const chunk of req) { total += chunk.length; if (total > 65536) throw Object.assign(new Error('request_too_large'), { status: 413 }); chunks.push(chunk); }
  if (!chunks.length) return null;
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw Object.assign(new Error('invalid_json'), { status: 400 }); }
}

const server = createServer(async (req, res) => {
  try {
    const body = await readJson(req);
    const result = await handleMockRequest({ method: req.method, path: req.url, body, headers: req.headers });
    if (result.delayMs) await new Promise(r => setTimeout(r, result.delayMs));
    res.writeHead(result.status, { 'access-control-allow-origin': '*', ...result.headers });
    res.end(JSON.stringify(result.body));
  } catch (e) {
    res.writeHead(e.status || 500, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: e.message === 'invalid_json' ? 'invalid_json' : 'server_error' }));
  }
});

server.listen(port, host, () => console.log(`Kal Se Nahi Round 3 mock listening on http://${host}:${port}`));
