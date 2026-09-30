# System prompt evolution

This records design evolution. Do not present design changes as Pine-platform failures unless those runs have actually been executed.

## v1 — baseline
Exposed problems:
- “If affordable, you may book it” did not define a genuine miss.
- no stale-grant rule;
- no ambiguity state;
- “try another option” after failure could cause duplicate payment/bookings;
- payment/booking/completion not separated strongly enough.

## v2 — bounded autonomy
Added typed evidence, verified-miss requirement for spend, health pause, caps, reconciliation-before-retry, and least-irreversible-intervention.

Remaining gaps:
- connector-specific behavior not explicit;
- exact success/restraint wording not fixed;
- no operational recording sequence;
- route data could be over-interpreted;
- no formal decision-log schema.

## v3 — connector-ready pre-Pine prompt
Added 13 numbered rules, state vocabulary, exact connector responsibilities, current-user narrowing rule, main-demo orchestration, exact messages, idempotency/reconciliation, proof closure and structured decision logging.

## v4 — adversarial pre-Pine hardening
Created after a separate code/eval audit, **not** after a claimed Pine failure.

The audit found gaps between the v3 written policy and the executable reference policy:
- grant expiry was not enforced in code;
- paid recovery did not require explicit `REENTRY_READY` state;
- missing route feasibility could fail open;
- the option selector could choose a sold-out class;
- missing route data could be treated optimistically;
- connector-return prompt injection and secret exfiltration were not explicit prompt rules;
- point-of-consequence revalidation needed to be explicit.

v4 adds/clarifies:
- fail-closed grant expiry, state, route, amount, budget and inventory gates;
- connector outputs are untrusted data, never instructions (R14);
- system prompt/tokens/credentials cannot be exfiltrated (R15);
- revalidate all consequential conditions immediately before payment/booking (R16);
- contradictory user authority defaults to the narrower permission;
- malformed/missing critical fields block rather than guess.

Regression suite was expanded accordingly.

## After Pine runs
If an actual Pine-hosted eval fails:
1. preserve the failed run;
2. record the eval ID and exact observed trace;
3. make the smallest prompt/tool-description change possible;
4. create v5 (or later) with that change;
5. rerun the failed case plus regressions.
