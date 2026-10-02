# Round 3 connector contract

The Pine agent owns every decision. The mock server returns external-world facts only.

## Connector set
1. Real user channel — Telegram if Pine supports it cleanly; otherwise WhatsApp/Gmail. Real.
2. Gnani STT — real Gnani connector/API.
3. Gnani TTS — real Gnani connector/API.
4. Delhivery Maps mock — `/route` and `/matrix` using official endpoint names/request fields.
5. Pine Labs payment — real Pine connector wherever available; otherwise P3P-style fallback mock.
6. Recovery Options — custom capability 1.
7. Recovery Booking — custom capability 2.
8. Outcome Attestation — custom capability 3.

## Delhivery-compatible mock
### POST `/route`
```json
{"geo_coords":[[28.495,77.088],[28.487,77.091]],"travel_mode":"auto","alternate_routes":false}
```
The mock varies ETA by destination and rejects malformed/out-of-India coordinates. Kal Se Nahi uses route duration only as physical-feasibility evidence.

### POST `/matrix`
```json
{"sources":[[28.495,77.088]],"targets":[[28.487,77.091],[28.480,77.100]],"travel_mode":"auto"}
```
Before final recording, compare the authenticated Delhivery reference response envelope with our mock and update keys if required. Do not change endpoint names or official request field names.

## Custom capability 1 — Recovery Options
Partner: Cult.fit-style class inventory (mock)
Endpoint: `GET /capabilities/recovery-options?goal_id=strength_class_fri_1900`
Partner data: class inventory, start time, venue, seats, price, location.
The response intentionally includes an affordable option, an over-cap option, and a sold-out option so the agent must decide.

## Custom capability 2 — Recovery Booking
Partner: Cult.fit-style booking system (mock)
Endpoint: `POST /capabilities/recovery-bookings`
```json
{"option_id":"class_1945","goal_id":"strength_class_fri_1900","idempotency_key":"<episode-id>:class_1945"}
```
Partner data: live seat inventory, booking records, session/venue IDs, price. The endpoint is idempotent.

## Custom capability 3 — Outcome Attestation
Partner: Cult.fit-style attendance source (mock)
Endpoint: `GET /capabilities/outcome-attestations?goal_id=...&event=...&as_of=...`
Partner data: QR/class check-in, booking/session identity, attendance timestamps, consent link.
Returns only goal/event, `pass | fail | unknown`, issuer, confidence, time, consent receipt and signature. It deliberately does not expose raw GPS or full fitness history.

## Pine-compatible fallback mock
Use only if the competition platform does not provide the needed Pine connector.
- `GET /mpp/v1/balance` — ACTIVE demo ReservePay-style balance.
- `POST /paid/recovery-booking` — no grant => 403; grant/no credential => 402 + `WWW-Authenticate`; grant+credential within ₹200 => capture + `Payment-Receipt`; over cap => 403.

The real P3P docs describe backend-held credentials, hosted Grantex consent, a 402 challenge, `P3P-Credential`, `X-Grantex-Token`, capture and `Payment-Receipt`; the fallback mock mirrors those observable states without claiming a real transaction.
