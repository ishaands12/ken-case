import { randomUUID } from 'node:crypto';

const bookings = new Map();
const json = (status, body, headers = {}) => ({ status, body, headers: { 'content-type': 'application/json; charset=utf-8', ...headers } });
const finiteCoord = p => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite);
const indiaCoord = ([lat, lng]) => lat >= 6 && lat <= 38 && lng >= 68 && lng <= 98;

function route(body) {
  const pts = body?.geo_coords;
  if (!Array.isArray(pts) || pts.length < 2 || !pts.every(finiteCoord)) return json(400, { detail: 'geo_coords must contain at least two [lat, lng] waypoints.' });
  if (!pts.every(indiaCoord)) return json(422, { detail: 'All coordinates must be within India.' });
  const travelMode = body.travel_mode || 'auto';
  if (!['auto','motorcycle','truck','pedestrian'].includes(travelMode)) return json(400, { detail: 'Unsupported travel_mode.' });
  const [a,b] = [pts[0], pts.at(-1)];
  const key = `${a.map(x=>x.toFixed(3)).join(',')}|${b.map(x=>x.toFixed(3)).join(',')}`;
  const presets = new Map([
    ['28.495,77.088|28.471,77.094', { distance: 8.7, duration: 2280 }],
    ['28.495,77.088|28.487,77.091', { distance: 3.1, duration: 720 }],
    ['28.495,77.088|28.480,77.100', { distance: 5.4, duration: 1140 }],
  ]);
  const p = presets.get(key) || { distance: 6.2, duration: 1500 };
  return json(200, { code: 'Ok', routes: [{ distance: p.distance, duration: p.duration, geometry: 'mock_polyline', legs: [] }], waypoints: pts.map((location, index) => ({ index, location })) });
}

function matrix(body) {
  const { sources, targets, travel_mode = 'auto' } = body || {};
  if (!Array.isArray(sources) || !sources.length || !Array.isArray(targets) || !targets.length || ![...sources,...targets].every(finiteCoord)) return json(400, { detail: 'sources and targets must be non-empty arrays of [lat, lng].' });
  if (![...sources,...targets].every(indiaCoord)) return json(422, { detail: 'All coordinates must be within India.' });
  if (!['auto','motorcycle','truck','pedestrian'].includes(travel_mode)) return json(400, { detail: 'Unsupported travel_mode.' });
  const durations = sources.map((_, i) => targets.map((__, j) => 720 + i * 180 + j * 420));
  const distances = durations.map(row => row.map(seconds => Number((seconds / 240).toFixed(1))));
  return json(200, { code: 'Ok', durations, distances });
}

function recoveryOptions(url) {
  const goalId = url.searchParams.get('goal_id');
  if (!goalId) return json(400, { error: 'goal_id is required' });
  return json(200, { partner: 'Cult.fit mock', goal_id: goalId, options: [
    { id: 'class_1945', action: 'book_paid_recovery', title: '45-min Strength Express', start_at: '2026-10-02T19:45:00+05:30', startMinutesFromNow: 34, price_paise: 18000, venue: 'Cult Partner Studio, Sector 43', coordinates: [28.487,77.091], seats: 3 },
    { id: 'class_2015', action: 'book_paid_recovery', title: 'Strength Reset', start_at: '2026-10-02T20:15:00+05:30', startMinutesFromNow: 64, price_paise: 25000, venue: 'Premium Partner Studio', coordinates: [28.480,77.100], seats: 5 },
    { id: 'class_soldout', action: 'book_paid_recovery', title: 'Mobility Reset', start_at: '2026-10-02T19:35:00+05:30', startMinutesFromNow: 24, price_paise: 15000, venue: 'Nearby Studio', coordinates: [28.489,77.090], seats: 0 }
  ]});
}

function createBooking(body) {
  if (!body?.option_id || !body?.goal_id || !body?.idempotency_key) return json(400, { error: 'option_id, goal_id and idempotency_key are required' });
  for (const b of bookings.values()) if (b.idempotency_key === body.idempotency_key) return json(200, b);
  if (body.option_id === 'class_soldout') return json(409, { error: 'class_sold_out', retryable: false });
  if (body.option_id === 'class_timeout') return { status: 504, body: { error: 'partner_timeout', retryable: true }, headers: { 'content-type': 'application/json' }, delayMs: 1500 };
  const price = body.option_id === 'class_2015' ? 25000 : 18000;
  const booking = { booking_id: `bk_${randomUUID().slice(0,8)}`, option_id: body.option_id, goal_id: body.goal_id, idempotency_key: body.idempotency_key, price_paise: price, status: 'confirmed', created_at: '2026-10-02T19:12:00+05:30' };
  bookings.set(booking.booking_id, booking);
  return json(201, booking);
}

function attestation(url) {
  const goalId = url.searchParams.get('goal_id');
  const event = url.searchParams.get('event');
  const asOf = url.searchParams.get('as_of') || '2026-10-02T19:10:00+05:30';
  if (!goalId || !event) return json(400, { error: 'goal_id and event are required' });
  if (event === 'original_attendance') return json(200, { goal_id: goalId, event, result: 'fail', issuer: 'Cult.fit mock', confidence: 0.99, observed_at: '2026-10-02T19:05:00+05:30', consent_receipt: 'consent_demo_01', signature: 'mock-sig-original-miss' });
  if (event === 'ambiguous_attendance') return json(200, { goal_id: goalId, event, result: 'unknown', issuer: 'Cult.fit mock', confidence: 0.42, observed_at: asOf, consent_receipt: 'consent_demo_01', signature: 'mock-sig-ambiguous' });
  if (event === 'recovery_attendance') {
    const after = Date.parse(asOf) >= Date.parse('2026-10-02T20:30:00+05:30');
    return json(200, { goal_id: goalId, event, result: after ? 'pass' : 'unknown', issuer: 'Cult.fit mock', confidence: after ? 0.98 : 0.50, observed_at: asOf, consent_receipt: 'consent_demo_01', signature: after ? 'mock-sig-restart-pass' : 'mock-sig-pending' });
  }
  return json(404, { error: 'unknown_event' });
}

function pineBalance(url) {
  const authorizationId = url.searchParams.get('authorizationId');
  if (!authorizationId) return json(400, { error: 'authorizationId is required' });
  return json(200, { status: 'ACTIVE', authorization_id: authorizationId, balance_details: { amount_blocked: { value: 30000, currency: 'INR' }, amount_debited: { value: 0, currency: 'INR' }, amount_remaining: { value: 30000, currency: 'INR' } } });
}

function paidRecovery(headers, body) {
  if (!headers['x-grantex-token']) return json(403, { status: 403, title: 'Missing delegated grant' });
  if (!headers['p3p-credential']) return json(402, { status: 402, title: 'Payment Required', amount: { value: body?.amount_paise || 18000, currency: 'INR' }, resource: '/paid/recovery-booking' }, { 'WWW-Authenticate': 'Payment realm="sandbox", mock="true"' });
  if ((body?.amount_paise || 0) > 20000) return json(403, { status: 403, title: 'Grant cap exceeded' });
  const receipt = Buffer.from(JSON.stringify({ id: `rcpt_${randomUUID().slice(0,8)}`, amount: body.amount_paise, currency: 'INR', status: 'captured' })).toString('base64url');
  return json(200, { paid: true, capture: { status: 'CAPTURED', amount_paise: body.amount_paise } }, { 'Payment-Receipt': receipt });
}

export async function handleMockRequest({ method, path, body = null, headers = {} }) {
  const url = new URL(path, 'https://mock.kalsenahi.local');
  const h = Object.fromEntries(Object.entries(headers).map(([k,v]) => [k.toLowerCase(), v]));
  if (method === 'GET' && url.pathname === '/health') return json(200, { ok: true, service: 'kal-se-nahi-round3-mock' });
  if (method === 'POST' && url.pathname === '/route') return route(body);
  if (method === 'POST' && url.pathname === '/matrix') return matrix(body);
  if (method === 'GET' && url.pathname === '/capabilities/recovery-options') return recoveryOptions(url);
  if (method === 'POST' && url.pathname === '/capabilities/recovery-bookings') return createBooking(body);
  if (method === 'GET' && url.pathname === '/capabilities/outcome-attestations') return attestation(url);
  if (method === 'GET' && url.pathname === '/mpp/v1/balance') return pineBalance(url);
  if (method === 'POST' && url.pathname === '/paid/recovery-booking') return paidRecovery(h, body);
  return json(404, { error: 'not_found', path: url.pathname });
}

export function resetMockState() { bookings.clear(); }
