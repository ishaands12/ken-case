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

Dashboard -> Agents -> Create Agent.

Use:
- Name: `Kal Se Nahi`
- Description: `L3 commitment agent that protects a movement commitment and autonomously arranges bounded recovery only when a current Goal Charter, verified evidence and all safety gates permit it.`
- Runtime: default LangGraph runtime supplied by the competition org.
- Start mode: Shadow / non-active while testing.
- System prompt: paste the complete contents of `round3/system-prompts/v4-adversarial-final.md`.

Do not paste API keys, Gnani credentials, Grantex tokens or mock secrets into the prompt.

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

Register the deployed server as a custom connector with Delhivery endpoint names.

Expose at least:
- `POST /route`
- `POST /matrix`

The agent must treat route output only as physical-feasibility data, never as attendance/completion proof.

## Step 4 — Register the 3 missing capabilities

These are the entire permitted custom-capability allowance. Do not add a fourth.

1. `RECOVERY_OPTIONS`
   - `GET /capabilities/recovery-options`
   - reads partner inventory already held by the hypothetical recovery partner
   - output includes option id, start time, price, seats, venue, coordinates

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

Any low-confidence or failed consequential transcription must become AMBIGUOUS, not inferred consent.

## Step 6 — Pine/Grantex payment

Use the platform's working Pine connector wherever available.

Grant only the minimum scope needed for the demo payment. Keep the ₹200 per-action cap and ₹300 recovery budget aligned with the Goal Charter.

The agent must never see or print raw credentials/tokens. Grantex should enforce connector permissions outside the model as well as the model checking its Charter.

Use the fallback payment mock only for an unavailable Pine capability and label it clearly as mock in the connector description/logs.

## Step 7 — Real user channel

Register one real external channel supported by the platform (Telegram/WhatsApp/Gmail/etc.). A team member acts as the user through that actual tool.

Do not type the user's supposedly external message directly into the Pine agent for the final recording.

## Step 8 — Tool-name binding

After all connectors exist, edit the system prompt once to replace the semantic aliases with the exact tool names Pine exposes.

Aliases to bind:
- `REAL_USER_CHANNEL`
- `GNANI_STT`
- `GNANI_TTS`
- `DELHIVERY_ROUTE`
- `DELHIVERY_MATRIX`
- `PINE_PAYMENT`
- `RECOVERY_OPTIONS`
- `RECOVERY_BOOKING`
- `OUTCOME_ATTESTATION`

Do not weaken R1-R16 while renaming tools.

## Step 9 — Shadow testing

Keep the agent in Shadow/non-active mode first.

Run:
1. the 10 official eval scenarios;
2. the full `round3/evals/PINE_ADVERSARIAL_MATRIX.md`;
3. critical money/safety scenarios at least 5 times each if the platform allows repeated runs.

Preserve every failed run and the exact prompt version that produced it.

## Step 10 — Recording gate

Do not record the final submission until all three traces are clean:

### Happy path
voice note -> Gnani STT -> self-report only -> independent verified miss -> inventory -> reject sold-out/over-cap options -> Delhivery feasibility -> R7/R16 revalidation -> Pine ₹180 payment -> idempotent booking -> Gnani TTS -> later independent recovery attendance -> VERIFIED_RESTART.

### Restraint run A
user says `don't spend today` -> no Pine payment call -> no paid booking -> free fallback or stop.

### Restraint run B
outcome proof returns unknown/conflicting -> AMBIGUOUS -> no payment -> no stake -> no claim of failure.

## What not to do

- Do not upload the whole GitHub app and call that the Pine agent.
- Do not move policy decisions into the mock server; Pine's agent must make them.
- Do not use a mock for a connector the competition requires to be real.
- Do not count payment or booking as completion.
- Do not hide failed eval runs.
- Do not activate before the tool scopes and no-go cases are tested.
