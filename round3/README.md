# Kal Se Nahi — Round 3 Build Package

This folder turns the Round 2 policy prototype into a connector-driven agent package for The Ken Build round.

## Ready now
- accuracy-hardened Pine-agent system prompt plus v1/v2/v3/v4 history;
- executable reference policy for the Goal Charter;
- Delhivery-compatible `/route` and `/matrix` mock endpoints;
- Pine P3P-style fallback mock for use only where the competition platform lacks a working connector;
- exactly three custom capability families: recovery options, recovery booking, outcome attestation;
- deterministic failure behavior and idempotency;
- **25 executable policy evals + 10 Node mock/adversarial tests = 35 local Round 3 checks**;
- Pine-hosted adversarial matrix for stochastic/tool-use testing;
- connector contract, Ishaan handoff, prompt changelog, and world-class release gates.

## Current final prompt
Use `system-prompts/v5-accuracy-final.md` as the starting prompt in Pine.

v5 keeps the v4 safety rules and additionally removes model-choice ambiguity by defining:
- exact rule precedence;
- SELF_REPORTED -> REENTRY_READY only after trusted miss proof;
- verified miss alone is not permission to spend;
- explicit current recovery-request semantics;
- deterministic paid-option ordering;
- schema-first connector validation;
- attestation confidence requirements;
- five-minute route feasibility buffer;
- cross-tool option/price consistency;
- serial payment -> validation -> booking execution;
- duplicate-event episode semantics.

## Local verification
```bash
npm run round3:eval
npm run round3:test
npm run round3:check
npm run round3:mock
```

The deterministic suite must be green before Pine testing. Local checks prove only the reference policy and mock behavior; Pine-hosted LLM behavior still requires Pine traces.

## Engineering handoff
- `ISHAAN_HANDOFF.md` — exact review/deploy/Pine tasks for Ishaan.
- `WORLD_CLASS_BENCHMARK.md` — what is proven, what is not, and no-go gates.
- `evals/PINE_ADVERSARIAL_MATRIX.md` — Pine-hosted cases; preserve failures.

## Pine platform setup order
1. Join `Ken's case competition` org.
2. Create agent `Kal Se Nahi`.
3. Paste `system-prompts/v5-accuracy-final.md`.
4. Register a real user channel.
5. Register Gnani STT + TTS.
6. Deploy/register the Delhivery mock.
7. Use real Pine connector wherever available; otherwise register the permitted fallback mock.
8. Register the three custom capability endpoints.
9. Replace semantic connector aliases in the prompt with Pine's exact registered tool names.
10. Run the internal matrix in `evals/PINE_ADVERSARIAL_MATRIX.md` and preserve every run, including failures.
11. Create the next prompt version only if a real Pine-hosted failure requires it; document that failure and the minimal fix.

## Strongest recorded run
Real voice note -> Gnani STT -> SELF_REPORTED -> trusted miss attestation -> REENTRY_READY -> explicit current recovery request -> recovery inventory -> reject sold-out/over-cap options -> Delhivery route feasibility -> recheck Goal Charter -> Pine ₹180 payment -> validate payment -> revalidate inventory/state -> idempotent recovery booking -> Gnani TTS reply -> independent recovery attendance attestation -> VERIFIED_RESTART.

Alternate run 1: user explicitly narrows authority to no paid action; no Pine call occurs.
Alternate run 2: attendance proof is UNKNOWN/conflicting; state becomes AMBIGUOUS and no money moves.

## Critical truth boundary
The reference policy is an eval oracle, not the production agent. The competition agent must make its decisions inside Pine. The mock server returns external-world facts only and must not decide which action Kal Se Nahi should take.
