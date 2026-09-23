import test from 'node:test';
import assert from 'node:assert/strict';
import { getRailStatus, synthesizeVoice } from '../server/rails.mjs';

function configure(t, key, fetchImpl) {
  const previous = process.env.GNANI_API_KEY;
  if (key === undefined) delete process.env.GNANI_API_KEY;
  else process.env.GNANI_API_KEY = key;
  t.after(() => {
    if (previous === undefined) delete process.env.GNANI_API_KEY;
    else process.env.GNANI_API_KEY = previous;
  });
  return t.mock.method(globalThis, 'fetch', fetchImpl || (() => { throw new Error('Unexpected network request'); }));
}

function wav() {
  const audio = Buffer.alloc(46);
  audio.write('RIFF', 0);
  audio.writeUInt32LE(38, 4);
  audio.write('WAVEfmt ', 8);
  audio.writeUInt32LE(16, 16);
  audio.writeUInt16LE(1, 20);
  audio.writeUInt16LE(1, 22);
  audio.writeUInt32LE(24000, 24);
  audio.writeUInt32LE(48000, 28);
  audio.writeUInt16LE(2, 32);
  audio.writeUInt16LE(16, 34);
  audio.write('data', 36);
  audio.writeUInt32LE(2, 40);
  return audio;
}

test('reading rail status makes no external requests and exposes no credentials', t => {
  const fetch = configure(t, 'test-only-key-status');
  const status = getRailStatus();
  assert.equal(status.find(rail => rail.id === 'gnani').status, 'configured');
  assert.equal(status.find(rail => rail.id === 'pinelabs').configured, false);
  assert.equal(JSON.stringify(status).includes('test-only-key-status'), false);
  assert.equal(fetch.mock.callCount(), 0);
});

test('missing credentials and invalid input never contact the provider', async t => {
  const fetch = configure(t);
  await assert.rejects(synthesizeVoice('Hello'), { code: 'GNANI_KEY_REQUIRED' });
  await assert.rejects(synthesizeVoice(' '), { code: 'INVALID_TEXT', statusCode: 400 });
  await assert.rejects(synthesizeVoice('a'.repeat(1201)), { code: 'INVALID_TEXT' });
  await assert.rejects(synthesizeVoice('Hello', 'unsupported'), { code: 'INVALID_LANGUAGE' });
  assert.equal(fetch.mock.callCount(), 0);
});

test('documented TTS request uses fixed destination, server header and binary audio', async t => {
  const audio = wav();
  const fetch = configure(t, 'test-only-key-request', async (url, options) => {
    assert.equal(url, 'https://api.vachana.ai/api/v1/tts/inference');
    assert.equal(options.redirect, 'error');
    assert.equal(options.headers['X-API-Key-ID'], 'test-only-key-request');
    const request = JSON.parse(options.body);
    assert.equal(request.text, 'आज थोड़ा शुरू करें।');
    assert.equal(request.model, 'timbre-v2.5');
    assert.equal(request.voice, 'Nalini');
    assert.equal(request.language, 'hi-IN');
    assert.equal(request.audio_config.container, 'wav');
    return new Response(audio, { headers: { 'Content-Type': 'audio/wav' } });
  });
  const result = await synthesizeVoice('  आज थोड़ा शुरू करें।  ', 'hi-IN');
  assert.deepEqual(result.audio, audio);
  assert.equal(result.contentType, 'audio/wav');
  assert.equal(getRailStatus()[0].status, 'connected');
  process.env.GNANI_API_KEY = 'different-test-key';
  assert.equal(getRailStatus()[0].status, 'configured');
  assert.equal(fetch.mock.callCount(), 1);
});

test('upstream failures never expose raw response bodies or retry paid requests', async t => {
  const fetch = configure(t, 'test-only-key-failure', async () => new Response('secret-provider-debug-info', { status: 403 }));
  await assert.rejects(synthesizeVoice('Hello'), error => {
    assert.equal(error.code, 'GNANI_ACCESS_DENIED');
    assert.equal(error.message.includes('secret-provider-debug-info'), false);
    assert.equal(error.message.includes('test-only-key-failure'), false);
    return true;
  });
  assert.equal(fetch.mock.callCount(), 1);
  assert.equal(getRailStatus()[0].status, 'configured');
});

test('non-audio provider responses are rejected', async t => {
  configure(t, 'test-only-key-format', async () => new Response('{"audio_url":"https://untrusted.invalid/audio"}'));
  await assert.rejects(synthesizeVoice('Hello'), { code: 'INVALID_AUDIO' });
});

test('response size is limited even when the provider omits content-length', async t => {
  configure(t, 'test-only-key-size', async () => new Response(new Uint8Array(8 * 1024 * 1024 + 1)));
  await assert.rejects(synthesizeVoice('Hello'), { code: 'AUDIO_TOO_LARGE' });
});

test('timeout errors are translated into a safe fallback message', async t => {
  configure(t, 'test-only-key-timeout', async () => { throw new DOMException('private context', 'TimeoutError'); });
  await assert.rejects(synthesizeVoice('Hello'), { code: 'GNANI_TIMEOUT', statusCode: 504 });
});
