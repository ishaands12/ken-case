import { handleMockRequest } from '../mock-core.mjs';

export default async function handler(req, res) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  let body = null;
  if (chunks.length) {
    try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
    catch { res.statusCode = 400; return res.end(JSON.stringify({ error: 'invalid_json' })); }
  }
  const result = await handleMockRequest({ method: req.method, path: req.url, body, headers: req.headers });
  if (result.delayMs) await new Promise(r => setTimeout(r, Math.min(result.delayMs, 2000)));
  for (const [k,v] of Object.entries(result.headers || {})) res.setHeader(k,v);
  res.statusCode = result.status;
  res.end(JSON.stringify(result.body));
}
