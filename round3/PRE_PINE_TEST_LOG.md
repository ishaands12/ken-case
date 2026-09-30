# Pre-Pine engineering test log

**Important:** These are local reference-implementation tests, not Pine platform runs. Add platform run logs after configuring the actual agent.

## Round 0 — policy contract
Date: 30 September 2026
Command: `node round3/evals/run-evals.mjs`
Result: **10/10 passed**

Coverage: verified miss permits bounded paid recovery; self-report does not unlock money; ambiguity blocks money; current no-spend instruction narrows authority; health pause; cap exceeded; stale grant after Charter edit; quiet hours; unresolved transaction blocks duplicate retry; free fallback requires no financial evidence.

## Round 0B — mock external-world behavior
Date: 30 September 2026
Command: `node --test round3/evals/mock-server.test.mjs`
Result: **6/6 passed**

Coverage: route differs by destination; malformed/out-of-India route inputs fail; inventory includes affordable/over-cap/sold-out choices; booking is idempotent; proof distinguishes fail/unknown/later pass; Pine fallback mock enforces grant, 402 challenge, receipt and ₹200 cap.

## Pine testing rounds
Do not fabricate these. For each platform run append: date/time; prompt version; eval ID; exact user input; connector trace; expected behavior; observed behavior; pass/fail; prompt change afterward; regression cases rerun.
