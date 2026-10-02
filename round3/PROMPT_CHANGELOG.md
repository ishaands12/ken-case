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

v4 added fail-closed grant/state/route/amount/budget/inventory gates, untrusted-tool-output handling, secret boundaries and point-of-consequence revalidation.

## v5 — instruction-consistency / accuracy hardening
Created after a second pre-Pine instruction audit, **not** after a claimed Pine-platform failure.

The audit found two important ambiguities that could make a capable LLM choose a reasonable but competition-wrong path:
- v4 allowed a self-reported lapse to be described as `REENTRY_READY` in one place while the demo sequence only reached `REENTRY_READY` after trusted miss proof;
- v4's least-irreversible-action wording could prefer a free fallback while the demo expected an autonomous paid recovery after “kuch karwa de”.

v5 resolves those and adds deterministic execution accuracy:
- SELF_REPORTED remains SELF_REPORTED until trusted attestation confirms the miss;
- verified miss alone is not permission to spend; paid recovery additionally needs an explicit current recovery request unless the Charter explicitly enables automatic paid recovery;
- exact rule precedence is defined;
- exact recovery-option ordering: earliest feasible, then lower price, then lexical option ID;
- tool payloads are schema-validated before reasoning;
- trusted attestation requires matching event/goal, issuer/signature and confidence >= 0.90;
- route feasibility uses a fixed five-minute arrival buffer;
- payment amount must equal the validated selected option price;
- option identity/price/coordinates must remain consistent across inventory, route, payment and booking;
- payment and booking are serial, never parallel;
- duplicate user events reuse the same logical episode/idempotency semantics.

The deterministic reference policy was updated to match, including tests for no current recovery delegation and payment-price mismatch.

## After Pine runs
If an actual Pine-hosted eval fails:
1. preserve the failed run;
2. record the eval ID and exact observed trace;
3. make the smallest prompt/tool-description change possible;
4. create v6 (or later) with that change;
5. rerun the failed case plus regressions.
