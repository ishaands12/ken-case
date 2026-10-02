# Pine dashboard setup — Kal Se Nahi

This is the exact handoff from the Round 3 GitHub package into AgenticOrg/Pine.

## Architecture

Pine hosts the agent brain and system prompt. GitHub/Vercel hosts the permitted mock APIs. Real user-channel, Gnani and working Pine connectors remain real tools.

```text
Human user
  -> real user channel
  -> Pine-hosted Kal Se Nahi agent
      -> Gnani STT/TTS (real)
      -> Delhivery-compatible mock (`/route`, `/matrix`)
      -> Pine payment connector (real where available; fallback mock only where permitted)
      -> custom capability 1: recovery options
      -> custom capability 2: recovery booking
      -> custom capability 3: outcome attestation
```

## Step 1 — Create the agent

Dashboard -> Agents -> Create Agent -> manual setup.

Use:
- Name: `Kal Se Nahi`
- Designation: `Autonomous Commitment & Recovery Agent`
- Domain: `Operations`
- Custom agent type: `Autonomous Commitment Agent`
- Reports to: no parent / human fallback.
- System prompt: paste the complete contents of `round3/system-prompts/v5-accuracy-final.md`.

Do not paste API keys, Gnani credentials, Grantex tokens or mock secrets into the prompt.

## Runtime accuracy settings
- Keep the competition workspace's supported LLM deployment unless Pine exposes a stronger approved tool-use model and you test it.
- Keep routing `Auto` unless evals show a reproducible routing failure.
- Use the lowest permitted confidence floor (currently observed as 50%) so ordinary uncertainty is handled by Kal Se Nahi's AMBIGUOUS/fail-closed policy instead of routinely outsourcing decisions to HITL.
- HITL remains only an emergency platform fallback, e.g. `confidence < 0.50`, not a normal decision step.
- Keep retries low (1 recommended) and never rely on platform retries for payments/bookings; R8/R19 control consequential retry behavior.

## Step 2 — Deploy the mock server

Deploy the `round3/` server through Vercel (or another HTTPS host).

Public endpoints required:
- `GET /health`
- `POST /route`
- `POST /matrix`
- `GET /capabilities/recovery-options?goal_id=...`
- `POST /capabilities/recovery-bookings`
- `GET /capabilities/outcome-attestations?goal_id=...&event=...`
- Pine fallback endpoints only if the competition platform does not provide the required Pine capability.

Verify `/health` before registering the connector.

## Step 3 — Register the Delhivery mock connector

Register the deployed server as a custom connector with Delhivery endpoint names/request/response fields exactly matching the required Delhivery docs.

Expose at least:
- `POST /route`
- `POST /matrix`

The agent treats route output only as physical-feasibility data, never attendance/completion proof. v5 computes feasibility using a five-minute arrival buffer.

## Step 4 — Register the 3 missing capabilities

These are the entire permitted custom-capability allowance. Do not add a fourth.

1. `RECOVERY_OPTIONS`
   - `GET /capabilities/recovery-options`
   - data: option id, future start time, price, seats, venue, coordinates

2. `RECOVERY_BOOKING`
   - `POST /capabilities/recovery-bookings`
   - requires `option_id`, `goal_id`, `idempotency_key`
   - must be idempotent

3. `OUTCOME_ATTESTATION`
   - `GET /capabilities/outcome-attestations`
   - returns pass/fail/unknown + issuer/confidence/consent/signature
   - never returns raw GPS or complete health/activity history

## Step 5 — Gnani

Register Gnani as required by the competition.

Create/expose two logical tools if the platform separates them:
- `GNANI_STT`: actual received voice audio -> transcript/confidence
- `GNANI_TTS`: final agent text -> audio

Any low-confidence or failed consequential transcription must become ambiguity/clarification, never inferred consent.

## Step 6 — Pine/Grantex payment

Use the platform's working Pine connector wherever available.

Grant only the minimum scope needed for the demo payment. Keep the ₹200 per-action cap and ₹300 recovery budget aligned with the Goal Charter.

The agent must never see or print raw credentials/tokens. Use the fallback payment mock only for an unavailable Pine capability and label it clearly as mock.

## Step 7 — Real user channel

Register one real external channel supported by the platform (Telegram/WhatsApp/Gmail/etc.). A team member acts as the user through that actual tool.

Do not type the user's supposedly external message directly into the Pine agent for the final recording.

## Step 8 — Tool-name binding

After all connectors exist, edit the system prompt once to replace semantic aliases with Pine's exact tool names:
- `REAL_USER_CHANNEL`
- `GNANI_STT`
- `GNANI_TTS`
- `DELHIVERY_ROUTE`
- `DELHIVERY_MATRIX`
- `PINE_PAYMENT`
- `RECOVERY_OPTIONS`
- `RECOVERY_BOOKING`
- `OUTCOME_ATTESTATION`

Do not weaken R1-R19 while renaming tools.

## Step 9 — Shadow testing

Run:
1. the 10 official submission eval scenarios;
2. the full `round3/evals/PINE_ADVERSARIAL_MATRIX.md`;
3. critical money/safety scenarios multiple times if the platform allows repeated runs.

Preserve every failed run and exact prompt version.

## Step 10 — Recording gate

Do not record until all three traces are clean.

### Happy path
voice note -> Gnani STT -> SELF_REPORTED -> trusted miss proof -> REENTRY_READY -> explicit recovery request -> inventory -> reject sold-out/over-cap -> Delhivery feasibility -> R7/R16 revalidation -> one Pine ₹180 payment -> validate -> revalidate -> one idempotent booking -> Gnani TTS -> later trusted recovery attendance -> VERIFIED_RESTART.

### Restraint A
`don't spend today` -> no Pine payment -> no paid booking -> free fallback or stop.

### Restraint B
outcome proof unknown/conflicting -> AMBIGUOUS -> no payment -> no claim of failure.

## What not to do
- Do not upload the whole GitHub app and call that the Pine agent.
- Do not move policy decisions into the mock server.
- Do not use a mock for a connector the competition requires to be real.
- Do not count payment/booking as completion.
- Do not hide failed eval runs.
- Do not activate before tool scopes and no-go cases are tested.
