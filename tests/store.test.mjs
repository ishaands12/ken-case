import test from 'node:test';
import assert from 'node:assert/strict';
import { Store } from '../server/store.mjs';

function requestId(label) { return `request_${label}_0001`; }

test('the persisted command ledger returns the original result for an identical retry', () => {
  const store = new Store(':memory:');
  try {
    const command = { type: 'SAVE_CHARTER', charter: {}, requestId: requestId('same') };
    const first = store.execute(command);
    const retry = store.execute(command);
    assert.equal(first.revision, 1);
    assert.equal(retry.revision, 1);
    assert.equal(retry.charter.version, 1);
    assert.equal(retry.audit.length, 1);
  } finally { store.close(); }
});

test('a request id cannot be reused to smuggle in a different action', () => {
  const store = new Store(':memory:');
  try {
    store.execute({ type: 'SAVE_CHARTER', charter: {}, requestId: requestId('conflict') });
    assert.throws(() => store.execute({ type: 'AUTHORIZE', accepted: true, requestId: requestId('conflict') }), { statusCode: 409 });
    const state = store.read();
    assert.equal(state.grant, null);
    assert.equal(state.revision, 1);
  } finally { store.close(); }
});

test('a rejected command is rolled back without adding a command receipt', () => {
  const store = new Store(':memory:');
  try {
    assert.throws(() => store.execute({ type: 'SAVE_CHARTER', charter: { time: '25:00' }, requestId: requestId('invalid') }), { statusCode: 400 });
    const state = store.read();
    assert.equal(state.revision, 0);
    assert.equal(state.charter.active, false);
    assert.throws(() => store.execute({ type: 'SAVE_CHARTER', charter: { time: '25:00' }, requestId: requestId('invalid') }), { statusCode: 400 });
  } finally { store.close(); }
});
