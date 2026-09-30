# Kal Se Nahi — Round 3 Build Package

This folder turns the Round 2 policy prototype into a connector-driven agent package for The Ken Build round.

## Ready now
- final Pine-agent system prompt plus v1/v2 history;
- executable reference policy for the Goal Charter;
- Delhivery-compatible `/route` and `/matrix` mock endpoints;
- Pine P3P-style fallback mock for use only where the competition platform lacks a working connector;
- exactly three custom capability families: recovery options, recovery booking, outcome attestation;
- deterministic failure behavior and idempotency;
- 10 policy evals plus mock API regression tests;
- connector contract and prompt changelog.

## Local verification
```bash
npm run round3:eval
npm run round3:test
npm run round3:mock
```

## Pine platform setup order
1. Join `Ken's case competition` org.
2. Create agent `Kal Se Nahi`.
3. Paste `system-prompts/v3-final.md`.
4. Register a real user channel.
5. Register Gnani STT + TTS.
6. Deploy/register the Delhivery mock.
7. Use real Pine connector wherever available; otherwise register the fallback mock.
8. Register the three custom capability endpoints.
9. Run all 10 evals inside Pine and save every run, including failures.
10. Create v4 only if Pine testing reveals a real failure.

## Strongest recorded run
Real voice note -> Gnani STT -> user statement classified as self-report -> trusted miss attestation -> recovery inventory -> reject sold-out/over-cap options -> Delhivery route feasibility -> recheck Goal Charter -> Pine ₹180 payment -> idempotent recovery booking -> Gnani TTS reply -> independent recovery attendance attestation -> VERIFIED_RESTART.

Alternate run 1: user explicitly narrows authority to no paid action; no Pine call occurs.
Alternate run 2: attendance proof is UNKNOWN/conflicting; state becomes AMBIGUOUS and no money moves.

## Critical truth boundary
Local tests prove the policy contract and mock behavior. They do **not** prove that the Pine-hosted LLM follows the system prompt. That must be verified on the competition platform and logged separately.
