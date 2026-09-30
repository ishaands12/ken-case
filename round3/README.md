# Kal Se Nahi — Round 3 Build Package

This folder turns the Round 2 policy prototype into a connector-driven agent package for The Ken Build round.

## Ready now
- adversarially hardened Pine-agent system prompt plus v1/v2/v3 history;
- executable reference policy for the Goal Charter;
- Delhivery-compatible `/route` and `/matrix` mock endpoints;
- Pine P3P-style fallback mock for use only where the competition platform lacks a working connector;
- exactly three custom capability families: recovery options, recovery booking, outcome attestation;
- deterministic failure behavior and idempotency;
- **23 executable policy evals + 10 Node mock/adversarial tests = 33 local Round 3 checks**;
- 36-case Pine-hosted adversarial matrix for stochastic/tool-use testing;
- connector contract, Ishaan handoff, and prompt changelog.

## Current final prompt
Use `system-prompts/v4-adversarial-final.md` as the starting prompt in Pine. It adds fail-closed route/inventory gates, grant expiry, untrusted-tool-output handling, secret boundaries, and point-of-consequence revalidation.

## Local verification
```bash
npm run round3:eval
npm run round3:test
npm run round3:check
npm run round3:mock
```

Current independently rerun deterministic result after the adversarial audit: **33/33 Round 3 checks pass**.

## Pine platform setup order
1. Join `Ken's case competition` org.
2. Create agent `Kal Se Nahi`.
3. Paste `system-prompts/v4-adversarial-final.md`.
4. Register a real user channel.
5. Register Gnani STT + TTS.
6. Deploy/register the Delhivery mock.
7. Use real Pine connector wherever available; otherwise register the permitted fallback mock.
8. Register the three custom capability endpoints.
9. Run the internal matrix in `evals/PINE_ADVERSARIAL_MATRIX.md` and preserve every run, including failures.
10. Create the next prompt version only if Pine testing reveals a real failure; document it in `PROMPT_CHANGELOG.md`.

## Strongest recorded run
Real voice note -> Gnani STT -> user statement classified as self-report -> trusted miss attestation -> recovery inventory -> reject sold-out/over-cap options -> Delhivery route feasibility -> recheck Goal Charter -> Pine ₹180 payment -> idempotent recovery booking -> Gnani TTS reply -> independent recovery attendance attestation -> VERIFIED_RESTART.

Alternate run 1: user explicitly narrows authority to no paid action; no Pine call occurs.
Alternate run 2: attendance proof is UNKNOWN/conflicting; state becomes AMBIGUOUS and no money moves.

## Critical truth boundary
Local tests prove the deterministic policy contract and mock behavior. They do **not** prove that the Pine-hosted LLM follows the system prompt, survives prompt injection, or behaves correctly with real connector latency/failures. Those claims require Pine traces and real connector runs.
