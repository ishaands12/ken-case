# System prompt evolution

This records design evolution. Do not present these as Pine-platform run failures until those runs have actually been executed.

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

## v3 — final pre-Pine prompt
Added 13 numbered rules, state vocabulary, exact connector responsibilities, current-user narrowing rule, main-demo orchestration, exact messages, idempotency/reconciliation, proof closure and structured decision logging.

## After Pine demo
Create v4 only if actual platform evals expose a failure. Record failing eval ID, observed output, minimal prompt change and regression cases rerun.
