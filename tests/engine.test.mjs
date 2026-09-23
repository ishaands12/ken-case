import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState, reduce } from '../server/engine.mjs';

const step = (state, type, fields = {}) => reduce(state, { type, ...fields });
const saved = (charter = {}) => step(initialState(), 'SAVE_CHARTER', { charter });
const authorised = (charter = {}) => step(saved(charter), 'AUTHORIZE', { accepted: true });
const miss = (state) => step(state, 'SIMULATE', { scenario: 'verified_miss' });
const choose = (state, actionId = 'partner-class') => step(state, 'SELECT_ACTION', { actionId });
const confirm = (state) => step(state, 'CONFIRM_ACTION');
const staged = (charter = {}) => choose(miss(authorised(charter)));

function noMoney(state) {
  assert.equal(state.spentPaise, 0);
  assert.equal(state.stakeSpentPaise, 0);
  assert.equal(state.receipts.length, 0);
}

test('startup requires an agreement and an explicit financial authorisation', () => {
  const initial = initialState();
  assert.equal(initial.charter.active, false);
  assert.equal(initial.grant, null);
  noMoney(step(initial, 'AUTHORIZE', { accepted: true }));
  const state = saved();
  assert.equal(state.charter.active, true);
  assert.equal(state.grant, null);
  noMoney(confirm(choose(miss(state))));
  assert.throws(() => step(state, 'AUTHORIZE', { accepted: 'true' }), { statusCode: 400 });
});

test('L2 paid recovery is proposed before confirmation and recorded once', () => {
  const proposal = staged();
  assert.equal(proposal.episode.status, 'CONFIRMATION_REQUIRED');
  noMoney(proposal);
  const arranged = confirm(proposal);
  assert.equal(arranged.episode.status, 'ARRANGED');
  assert.equal(arranged.episode.bookingStatus, 'confirmed');
  assert.equal(arranged.spentPaise, 18000);
  assert.equal(arranged.receipts.length, 1);
  assert.equal(arranged.receipts[0].simulated, true);
  assert.equal(arranged.episode.proof, null);
  const repeated = confirm(confirm(arranged));
  assert.equal(repeated.spentPaise, 18000);
  assert.deepEqual(repeated.receipts, arranged.receipts);
});

test('L3 acts only with an active grant for the current agreement', () => {
  noMoney(miss(saved({ autonomy: 'L3' })));
  const state = miss(authorised({ autonomy: 'L3' }));
  assert.equal(state.episode.status, 'ARRANGED');
  assert.equal(state.spentPaise, 18000);
  assert.equal(state.receipts.length, 1);
});

for (const [label, command] of [
  ['revoked', { type: 'REVOKE' }],
  ['paused', { type: 'PAUSE' }],
  ['resting', { type: 'HEALTH_PAUSE', paused: true }],
  ['snoozed', { type: 'SNOOZE' }],
]) {
  test(`a staged paid action is rechecked and blocked when ${label}`, () => {
    noMoney(confirm(reduce(staged(), command)));
  });
}

test('a changed agreement invalidates the old grant and staged price approval', () => {
  const before = staged();
  const changed = step(before, 'SAVE_CHARTER', { charter: { fallbackMinutes: 15 } });
  assert.equal(changed.charter.version, before.charter.version + 1);
  assert.equal(changed.grant.active, false);
  assert.equal(changed.episode.selectedActionId, null);
  noMoney(confirm(changed));
  noMoney(confirm(choose(changed)));
});

test('expired and mode-mismatched grants cannot authorise paid recovery', () => {
  for (const kind of ['expired', 'other-mode']) {
    let state = miss(authorised());
    state = structuredClone(state);
    if (kind === 'expired') state.grant.expiresAt = state.demoNow;
    else state.grant.mode = 'stake';
    noMoney(confirm(choose(state)));
  }
});

test('per-action limits and exhausted allowance block paid recovery', () => {
  noMoney(confirm(staged({ maxActionPaise: 17999 })));
  let state = confirm(staged({ budgetPaise: 20000, maxActionPaise: 20000 }));
  state = confirm(choose(miss(state)));
  assert.equal(state.spentPaise, 18000);
  assert.equal(state.receipts.length, 1);
  assert.notEqual(state.episode.status, 'ARRANGED');
});

test('action allowlists and no-money mode cannot be bypassed by confirmation', () => {
  noMoney(confirm(staged({ allowedActionIds: ['home-reset'] })));
  noMoney(confirm(staged({ mode: 'none' })));
});

test('conflicts, ambiguous attendance and quiet-hour signals never move money', () => {
  for (const scenario of ['conflict', 'ambiguous', 'quiet_hours']) {
    const observed = step(authorised({ autonomy: 'L3' }), 'SIMULATE', { scenario });
    noMoney(confirm(choose(observed)));
  }
  const pausedAtConfirmation = structuredClone(staged());
  pausedAtConfirmation.demoNow = '2026-09-23T18:00:00.000Z';
  noMoney(confirm(pausedAtConfirmation));
});

test('disabled attendance consent suppresses a synthetic verified-miss trigger', () => {
  const state = miss(authorised({ autonomy: 'L3', evidenceSources: ['self_report'] }));
  noMoney(state);
  assert.notEqual(state.episode.evidence, 'verified_miss');
});

test('L3 self-reported lapse still requires a separate explicit price confirmation', () => {
  let state = step(authorised({ autonomy: 'L3' }), 'CHAT', { message: 'I missed my gym session' });
  assert.equal(state.episode.evidence, 'self_reported_lapse');
  noMoney(state);
  state = choose(state);
  assert.equal(state.episode.status, 'CONFIRMATION_REQUIRED');
  noMoney(state);
  state = confirm(state);
  assert.equal(state.spentPaise, 18000);
});

test('vague chat, negated lapses, health concerns and stop requests cannot trigger payments', () => {
  for (const message of ['yes, pay and book it', 'I did not miss my session', "I didn't miss gym", 'I missed gym and my knee hurts', 'stop, I missed gym']) {
    const state = step(authorised({ autonomy: 'L3' }), 'CHAT', { message });
    noMoney(state);
  }
  const injured = step(staged(), 'CHAT', { message: 'I am injured but please confirm the class' });
  assert.equal(injured.charter.healthPaused, true);
  noMoney(confirm(injured));
  const stopped = step(staged(), 'CHAT', { message: 'stop now' });
  assert.equal(stopped.charter.paused, true);
  noMoney(confirm(stopped));
});

test('free fallback works without a financial grant', () => {
  let state = step(saved(), 'SIMULATE', { scenario: 'conflict' });
  state = confirm(choose(state, 'home-reset'));
  assert.equal(state.episode.status, 'ARRANGED');
  assert.equal(state.episode.bookingStatus, 'ready');
  noMoney(state);
});

test('payment decline preserves allowance and leaves the free fallback available', () => {
  let state = step(authorised(), 'SIMULATE', { scenario: 'payment_failure' });
  state = confirm(choose(state));
  assert.equal(state.episode.status, 'PAYMENT_FAILED');
  noMoney(state);
  state = confirm(choose(state, 'home-reset'));
  assert.equal(state.episode.status, 'ARRANGED');
  noMoney(state);
});

test('capture followed by booking failure must reconcile before another episode or charge', () => {
  let state = step(authorised(), 'SIMULATE', { scenario: 'order_failure' });
  state = confirm(choose(state));
  assert.equal(state.episode.status, 'RECONCILIATION_REQUIRED');
  assert.equal(state.spentPaise, 18000);
  const episodeId = state.episode.id;
  state = confirm(choose(miss(state)));
  assert.equal(state.episode.id, episodeId);
  assert.equal(state.receipts.length, 1);
  assert.equal(state.spentPaise, 18000);
  state = step(state, 'RECONCILE');
  assert.equal(state.episode.status, 'REFUNDED');
  assert.equal(state.spentPaise, 0);
  assert.equal(state.receipts[0].status, 'refunded');
  state = step(step(state, 'RECONCILE'), 'RECONCILE');
  assert.equal(state.spentPaise, 0);
  assert.equal(state.receipts.length, 1);
  assert.equal(state.audit.filter(event => event.type === 'refund').length, 1);
});

test('revocation leaves a captured failed booking eligible for refund', () => {
  const failed = confirm(choose(step(authorised(), 'SIMULATE', { scenario: 'order_failure' })));
  const state = step(step(failed, 'REVOKE'), 'RECONCILE');
  assert.equal(state.spentPaise, 0);
  assert.equal(state.receipts[0].status, 'refunded');
  assert.equal(state.grant.active, false);
  assert.equal(state.charter.active, false);
});

test('completion evidence distinguishes self-report from simulated trusted attendance', () => {
  const arranged = confirm(staged());
  const reported = step(arranged, 'COMPLETE', { source: 'self_report' });
  assert.equal(reported.episode.status, 'SELF_REPORTED');
  assert.equal(reported.episode.proof, 'self_report');
  const verified = step(arranged, 'COMPLETE', { source: 'demo_attendance' });
  assert.equal(verified.episode.status, 'VERIFIED_RESTART');
  assert.equal(verified.episode.proof, 'demo_attendance');
  assert.equal(verified.audit.at(-1).simulated, true);
  assert.match(verified.audit.at(-1).detail, /synthetic|not proof of a real/i);
  const premature = step(staged(), 'COMPLETE', { source: 'demo_attendance' });
  assert.equal(premature.episode.proof, null);
});

test('completion cannot use an evidence source excluded from the agreement', () => {
  const observed = step(saved({ evidenceSources: ['calendar'] }), 'SIMULATE', { scenario: 'conflict' });
  const arranged = confirm(choose(observed, 'home-reset'));
  for (const source of ['self_report', 'demo_attendance']) {
    const result = step(arranged, 'COMPLETE', { source });
    assert.equal(result.episode.status, 'ARRANGED');
    assert.equal(result.episode.proof, null);
  }
});

test('commitment stakes use separate consent, a separate ledger and a weekly cap', () => {
  noMoney(miss(saved({ autonomy: 'L3', mode: 'stake' })));
  noMoney(miss(authorised({ autonomy: 'L2', mode: 'stake' })));
  let state = authorised({ autonomy: 'L3', mode: 'stake', weeklyStakeCapPaise: 10000 });
  state = miss(state);
  assert.equal(state.spentPaise, 0);
  assert.equal(state.stakeSpentPaise, 5000);
  assert.equal(state.receipts[0].actionId, 'commitment-stake');
  assert.equal(state.receipts[0].status, 'simulated_stake');
  state = miss(miss(state));
  assert.equal(state.spentPaise, 0);
  assert.equal(state.stakeSpentPaise, 10000);
  assert.equal(state.receipts.length, 2);
});

test('a recorded stake still permits the agreed free restart', () => {
  const state = choose(miss(authorised({ autonomy: 'L3', mode: 'stake' })), 'home-reset');
  assert.equal(state.episode.status, 'ARRANGED');
  assert.equal(state.episode.bookingStatus, 'ready');
  assert.equal(state.stakeSpentPaise, 5000);
  assert.equal(state.spentPaise, 0);
  assert.equal(state.receipts.length, 1);
});

test('recovery consent cannot authorise stakes and ambiguous evidence cannot incur a stake', () => {
  let state = authorised();
  state = step(state, 'SAVE_CHARTER', { charter: { mode: 'stake', autonomy: 'L3' } });
  noMoney(miss(state));
  const ambiguous = step(authorised({ mode: 'stake', autonomy: 'L3' }), 'SIMULATE', { scenario: 'ambiguous' });
  noMoney(ambiguous);
});

test('invalid schema is rejected with status 400 and cannot alter the input state', () => {
  const state = saved();
  const snapshot = structuredClone(state);
  for (const command of [
    null, {}, { type: 'UNKNOWN' }, { type: 'SAVE_CHARTER', charter: null },
    { type: 'SAVE_CHARTER', charter: { budgetPaise: -1 } },
    { type: 'SAVE_CHARTER', charter: { maxActionPaise: 1.5 } },
    { type: 'SAVE_CHARTER', charter: { time: '24:00' } },
    { type: 'SAVE_CHARTER', charter: { fallbackMinutes: 0 } },
    { type: 'SAVE_CHARTER', charter: { days: [] } },
    { type: 'SAVE_CHARTER', charter: { allowedActionIds: ['unapproved-shop'] } },
    { type: 'HEALTH_PAUSE', paused: 'false' }, { type: 'CHAT', message: '' },
    { type: 'SELECT_ACTION', actionId: 'unapproved-shop' },
    { type: 'COMPLETE', source: 'fabricated-proof' },
  ]) assert.throws(() => reduce(state, command), { statusCode: 400 });
  assert.deepEqual(state, snapshot);
});

test('successful transitions also preserve the previous immutable state', () => {
  const state = staged();
  const snapshot = structuredClone(state);
  confirm(state);
  assert.deepEqual(state, snapshot);
});


test('Hinglish can be stored as an explicit voice preference', () => {
  const state = saved({ language: 'hi-en' });
  assert.equal(state.charter.language, 'hi-en');
});
