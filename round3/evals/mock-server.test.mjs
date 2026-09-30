import test from 'node:test';
import assert from 'node:assert/strict';
import { handleMockRequest, resetMockState } from '../mock-core.mjs';

test('Delhivery route returns different ETA for known destinations', async () => {
  const a = await handleMockRequest({ method:'POST', path:'/route', body:{ geo_coords:[[28.495,77.088],[28.471,77.094]], travel_mode:'auto' } });
  const b = await handleMockRequest({ method:'POST', path:'/route', body:{ geo_coords:[[28.495,77.088],[28.487,77.091]], travel_mode:'auto' } });
  assert.equal(a.status, 200); assert.equal(b.status, 200); assert.ok(a.body.routes[0].duration > b.body.routes[0].duration);
});

test('Delhivery route rejects malformed and non-India coordinates', async () => {
  assert.equal((await handleMockRequest({ method:'POST', path:'/route', body:{ geo_coords:[[28,77]] } })).status, 400);
  assert.equal((await handleMockRequest({ method:'POST', path:'/route', body:{ geo_coords:[[0,0],[1,1]] } })).status, 422);
});

test('recovery options include affordable, over-cap, and sold-out choices', async () => {
  const r = await handleMockRequest({ method:'GET', path:'/capabilities/recovery-options?goal_id=g1' });
  assert.equal(r.status, 200); assert.equal(r.body.options.length, 3);
  assert.ok(r.body.options.some(x => x.price_paise === 18000));
  assert.ok(r.body.options.some(x => x.price_paise > 20000));
  assert.ok(r.body.options.some(x => x.seats === 0));
});

test('booking is idempotent and sold-out class fails', async () => {
  resetMockState();
  const body={ option_id:'class_1945', goal_id:'g1', idempotency_key:'episode-1' };
  const a=await handleMockRequest({ method:'POST', path:'/capabilities/recovery-bookings', body });
  const b=await handleMockRequest({ method:'POST', path:'/capabilities/recovery-bookings', body });
  assert.equal(a.status,201); assert.equal(b.status,200); assert.equal(a.body.booking_id,b.body.booking_id);
  const sold=await handleMockRequest({ method:'POST', path:'/capabilities/recovery-bookings', body:{...body,option_id:'class_soldout',idempotency_key:'episode-2'} });
  assert.equal(sold.status,409);
});

test('attestation distinguishes fail, unknown, and later verified restart', async () => {
  const miss=await handleMockRequest({ method:'GET', path:'/capabilities/outcome-attestations?goal_id=g1&event=original_attendance' });
  const amb=await handleMockRequest({ method:'GET', path:'/capabilities/outcome-attestations?goal_id=g1&event=ambiguous_attendance' });
  const before=await handleMockRequest({ method:'GET', path:'/capabilities/outcome-attestations?goal_id=g1&event=recovery_attendance&as_of=2026-10-02T20:00:00%2B05:30' });
  const after=await handleMockRequest({ method:'GET', path:'/capabilities/outcome-attestations?goal_id=g1&event=recovery_attendance&as_of=2026-10-02T20:35:00%2B05:30' });
  assert.equal(miss.body.result,'fail'); assert.equal(amb.body.result,'unknown'); assert.equal(before.body.result,'unknown'); assert.equal(after.body.result,'pass');
});

test('Pine mock uses challenge then receipt and enforces cap', async () => {
  const noGrant=await handleMockRequest({ method:'POST', path:'/paid/recovery-booking', body:{amount_paise:18000}, headers:{} });
  assert.equal(noGrant.status,403);
  const challenge=await handleMockRequest({ method:'POST', path:'/paid/recovery-booking', body:{amount_paise:18000}, headers:{'X-Grantex-Token':'g'} });
  assert.equal(challenge.status,402); assert.ok(challenge.headers['WWW-Authenticate']);
  const paid=await handleMockRequest({ method:'POST', path:'/paid/recovery-booking', body:{amount_paise:18000}, headers:{'X-Grantex-Token':'g','P3P-Credential':'Payment demo'} });
  assert.equal(paid.status,200); assert.ok(paid.headers['Payment-Receipt']);
  const over=await handleMockRequest({ method:'POST', path:'/paid/recovery-booking', body:{amount_paise:25000}, headers:{'X-Grantex-Token':'g','P3P-Credential':'Payment demo'} });
  assert.equal(over.status,403);
});
