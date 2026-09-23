# Connecting Kal Se Nahi

Research checked against official provider documentation on 22 September 2026. The app is a local competition demo. Creating an account does not mean that its API is connected.

## What works now

| Capability | Implementation | What a demonstration can truthfully show |
| --- | --- | --- |
| Recovery decisions and consent | Local server policy and persisted state | Working agreement, evidence checks, pause, grant revocation, action selection and audit trail |
| Spoken replies | Browser read-aloud; optional server-side Gnani TTS adapter | Browser voice by default; actual Gnani audio after adding a valid key and making a successful request |
| Payment / refund | Simulated local records | Demo receipts and failure recovery; no funds move |
| Grantex delegation | Simulated local grant | Version-bound demo authorization; no externally issued grant |
| Class booking / attendance | Simulated partner | Booking and evidence workflow; no reservation reaches a gym |
| Delhivery Maps | Not connected | Future address checks; no delivery is arranged |

## Connect the Gnani account you already have

1. Sign into the [Gnani API dashboard](https://app.gnani.ai) and generate a Speech API key. Gnani documents its speech APIs separately from its Agent Builder product; an Agent Builder login alone does not establish API access. Check that your account has speech access and sufficient credits. See the [Gnani introduction](https://docs.gnani.ai/api/introduction/introduction) and [quick start](https://docs.gnani.ai/api/introduction/quick-start).
2. Create a private `.env` file in the app folder using `.env.example` as the template. Set `GNANI_API_KEY` to your key. Keep it on your machine; do not put it in this document, a chat message or a screenshot. The server reads it; the browser never receives it.
3. Restart the app. Connections should say **configured**, which means a key is present and has not yet been verified.
4. On a displayed agent reply, choose Gnani playback. This sends that reply to Gnani and can use account credits. One successful WAV response changes the connection state to **connected** for this running server session.
5. If Gnani refuses the call, check access and credits in the dashboard. The interface keeps browser read-aloud available. A failed request never turns a simulated payment into a real one.

No key is included in this project. Live Gnani access cannot be verified until you supply one locally. There are no automatic calls when the app starts or when you open Connections.

### Implemented API boundary

The adapter uses the documented `POST https://api.vachana.ai/api/v1/tts/inference`, authenticates with `X-API-Key-ID`, and requests `timbre-v2.5` WAV audio. Language choices are English (`en-IN`), Hindi (`hi-IN`) and Hinglish (`hi-en`). Defaults are Kaveri, Nalini and Poorvi respectively. These parameters and binary responses are documented in [Gnani TTS REST](https://docs.gnani.ai/api/TTS/tts-inference); voice availability is listed in the [voice catalog](https://docs.gnani.ai/api/TTS/available-voices).

`server/rails.mjs` exports:

```js
getRailStatus();
// [{ id, name, status, detail, configured }, ...]

await synthesizeVoice(text, language);
// { audio: Buffer, contentType: 'audio/wav', provider: 'Gnani', model: 'timbre-v2.5' }
```

Application limits: 1,200 characters, a 20-second timeout and an 8 MiB response limit. The adapter checks the WAV signature, forbids redirects and accepts no configurable destination URL. It does not log credentials, copy provider error bodies into the interface or automatically retry billable requests. These limits are our implementation choices, not provider quota claims.

Actual speech recognition is a later integration. The current adapter implements spoken output only. Gnani documents a REST transcription endpoint for short clips and a separate streaming option; adding it requires microphone capture and an explicit disclosure about sending recorded audio. See [Gnani STT REST](https://docs.gnani.ai/api/STT/speech-to-text). Any browser dictation must retain its browser label.

## Pine Labs and Grantex next steps

You currently have no Pine Labs/Grantex sandbox account. The demo deliberately has no environment switch that enables real charges.

For sandbox integration, create a Pine Labs Online developer account from the official dashboard linked in the [P3P quick start](https://www.pinelabs.com/docs/online-payments/ai/p3p/quickstart). After email verification, switch to Test mode, then Settings → API Keys. Keep the client ID and secret server-side. Confirm that the intended payment method is enabled for your account before integration.

Create a Grantex account, save its API key, register an agent and configure payment scopes. Pine Labs documents `mpp:payment:initiate` and a bounded payment scope pattern, with a concrete maximum in the user's grant. Its [P3P SDK guide](https://www.pinelabs.com/docs/online-payments/ai/p3p/sdks) covers hosted authorization, grant storage, mandate creation, payment challenges, capture and debit status.

The next implementation must connect those flows to our existing policy checks and reconciliation records. Acceptance evidence should include sandbox receipts, authenticated callbacks, revoked-grant rejection, duplicate-request handling and a captured-payment/failed-booking recovery. Enabling actual gym fulfilment also needs a participating partner and a tested booking API. API credentials alone do not provide that service.

## Demo evidence

Run the automated checks with `npm test`. Rail tests replace the network function with deterministic responses. They verify credential isolation, input validation, documented request construction, valid audio handling, response limits and safe error messages. They do **not** claim a successful live provider call.

For a competition recording, show the Connections view before demonstrating. Keep each payment, booking and attendance label visibly simulated. Once Gnani is connected, it is accurate to say: “The voice response uses Gnani; spending and fulfilment are simulated in this prototype.”
