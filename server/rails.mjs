import { createHash } from 'node:crypto';

// Source: https://docs.gnani.ai/api/TTS/tts-inference (verified 22 Sep 2026).
// Keep the provider destination fixed: credentials must never be sent to a caller URL.
const GNANI_TTS_URL = 'https://api.vachana.ai/api/v1/tts/inference';
const MAX_AUDIO_BYTES = 8 * 1024 * 1024;
const VOICES = Object.freeze({ 'en-IN': 'Kaveri', 'hi-IN': 'Nalini', 'hi-en': 'Poorvi' });
let verifiedKeyFingerprint = null;

export class RailError extends Error {
  constructor(message, code, statusCode = 503) {
    super(message);
    this.name = 'RailError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

function fingerprint(key) {
  return createHash('sha256').update(key).digest('hex');
}

function apiKey() {
  return (process.env.GNANI_API_KEY || '').trim();
}

/** Public connection metadata only; never returns credentials or contacts providers. */
export function getRailStatus() {
  const key = apiKey();
  const configured = Boolean(key);
  const verified = configured && fingerprint(key) === verifiedKeyFingerprint;
  return [
    {
      id: 'gnani', name: 'Gnani voice', configured,
      status: verified ? 'connected' : configured ? 'configured' : 'key_required',
      detail: verified
        ? 'Gnani returned valid speech in this session. Listen sends the displayed reply to Gnani; browser voice is also available.'
        : configured
          ? 'A server key is present. Use Listen to verify speech access; credentials have not been tested.'
          : 'Your Gnani account needs a Speech API key on this server. Browser read-aloud works without it.',
    },
    {
      id: 'pinelabs', name: 'Pine Labs payments', configured: false, status: 'demo',
      detail: 'Payments and refunds are simulated. Sandbox merchant credentials and a tested payment integration are still required.',
    },
    {
      id: 'grantex', name: 'Grantex consent', configured: false, status: 'demo',
      detail: 'The agreement and grant are local demo records. Hosted consent, scoped grants and revocation need a Grantex account and integration.',
    },
    {
      id: 'delhivery', name: 'Delhivery Maps', configured: false, status: 'not_connected',
      detail: 'Address validation is planned. Classes and deliveries remain simulated; maps access alone does not arrange fulfilment.',
    },
  ];
}

async function boundedAudio(response) {
  const length = response.headers.get('content-length');
  if (length && Number(length) > MAX_AUDIO_BYTES) {
    await response.body?.cancel();
    throw new RailError('The voice response was too large. Try a shorter reply.', 'AUDIO_TOO_LARGE', 502);
  }
  if (!response.body) throw new RailError('Gnani returned no audio. Browser voice is available.', 'INVALID_AUDIO', 502);
  const reader = response.body.getReader();
  const chunks = [];
  let bytes = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_AUDIO_BYTES) {
        await reader.cancel();
        throw new RailError('The voice response was too large. Try a shorter reply.', 'AUDIO_TOO_LARGE', 502);
      }
      chunks.push(Buffer.from(value));
    }
  } finally {
    reader.releaseLock();
  }
  const audio = Buffer.concat(chunks);
  if (audio.length < 44 || audio.toString('ascii', 0, 4) !== 'RIFF' || audio.toString('ascii', 8, 12) !== 'WAVE') {
    throw new RailError('Gnani did not return a valid WAV response. Browser voice is available.', 'INVALID_AUDIO', 502);
  }
  return audio;
}

/**
 * Called only after an explicit Listen action. No network requests on startup.
 * Returns {audio: Buffer, contentType: string, provider: string, model: string}.
 * No retry: each synthesis can consume account credits.
 */
export async function synthesizeVoice(text, language = 'en-IN') {
  if (typeof text !== 'string' || !text.trim() || text.length > 1200) {
    throw new RailError('Choose a reply between 1 and 1,200 characters to read aloud.', 'INVALID_TEXT', 400);
  }
  if (!Object.hasOwn(VOICES, language)) {
    throw new RailError('Choose English, Hindi or Hinglish for voice playback.', 'INVALID_LANGUAGE', 400);
  }
  const key = apiKey();
  if (!key) throw new RailError('Add your Gnani Speech API key on the server first, or use browser voice.', 'GNANI_KEY_REQUIRED');
  try {
    const response = await fetch(GNANI_TTS_URL, {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(20000),
      headers: { 'Content-Type': 'application/json', 'X-API-Key-ID': key, Accept: 'audio/wav' },
      body: JSON.stringify({
        text: text.trim(), model: 'timbre-v2.5', voice: VOICES[language], language, speed: 1.0,
        audio_config: { sample_rate: 24000, num_channels: 1, sample_width: 2, encoding: 'linear_pcm', container: 'wav' },
      }),
    });
    if (!response.ok) {
      await response.body?.cancel();
      if (response.status === 401 || response.status === 403) {
        throw new RailError('Gnani denied this request. Check your Speech API key, account access and credits.', 'GNANI_ACCESS_DENIED');
      }
      if (response.status === 429) throw new RailError('Gnani is rate limiting speech requests. Try again later or use browser voice.', 'GNANI_RATE_LIMITED', 429);
      throw new RailError('Gnani could not generate speech. Try again later or use browser voice.', 'GNANI_UNAVAILABLE', 502);
    }
    const audio = await boundedAudio(response);
    verifiedKeyFingerprint = fingerprint(key);
    return { audio, contentType: 'audio/wav', provider: 'Gnani', model: 'timbre-v2.5' };
  } catch (error) {
    verifiedKeyFingerprint = null;
    if (error instanceof RailError) throw error;
    if (error?.name === 'TimeoutError' || error?.name === 'AbortError') {
      throw new RailError('Gnani speech took too long. Browser voice is available.', 'GNANI_TIMEOUT', 504);
    }
    // Deliberately omit upstream response bodies and exception causes from public errors.
    throw new RailError('Could not reach Gnani speech. Browser voice is available.', 'GNANI_UNAVAILABLE', 502);
  }
}
