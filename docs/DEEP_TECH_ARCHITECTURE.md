# Kal Se Nahi deep-tech architecture

## One-line system thesis

**The model suggests; the policy decides; the rails execute; proof closes the loop.**

Kal Se Nahi is designed as a zero-trust agent runtime for long-horizon personal commitments.

## 1. Commitment compiler

Natural-language intent is converted into a machine-readable Goal Charter only after the user reviews it.

Example:

```json
{
  "goal_id": "gym_mwf_1900",
  "schedule": ["Mon 19:00", "Wed 19:00", "Fri 19:00"],
  "flexibility_minutes": 90,
  "fallbacks": [
    {"action": "home_reset", "minutes": 20, "cost_paise": 0},
    {"action": "approved_class", "max_cost_paise": 20000}
  ],
  "evidence": ["calendar", "attendance", "self_report"],
  "autonomy": "L3",
  "money_mode": "recovery",
  "quiet_hours": ["22:00", "08:00"],
  "ambiguity_policy": "stop"
}
```

The LLM may help parse the sentence. It does not get to expand the user's authority.

## 2. Autonomy envelope

Every action is evaluated against the same monotonic gates:

```
policy(action):
  current Charter?
  current grant?
  action allow-listed?
  evidence strong enough for this action?
  budget/cap okay?
  outside quiet hours?
  health pause false?
  outstanding reconciliation absent?
```

An uncertain world reduces autonomy.

## 3. Least-irreversible-intervention planner

The runtime prefers:
1. no action;
2. preserve original plan;
3. smaller free fallback;
4. voice negotiation;
5. bounded paid recovery;
6. bounded stake.

The agent is optimized for **commitment survival**, not for maximizing interventions or money movement.

## 4. Proof-gated delegation

The missing infrastructure primitive is a payment grant whose validity depends on an externally issued behavioural attestation.

```
ordinary grant:
  agent A may spend <= ₹200

conditional grant:
  agent A may spend <= ₹200
  only for goal G
  under Charter V
  only if attestation schema S says event E
  before expiry T
```

This removes the LLM from the trust boundary.

## 5. Outcome attestation

The proof rail should expose:
- pass/fail/unknown;
- event type;
- time window;
- issuer;
- source confidence/provenance;
- consent id;
- signature.

It should not expose raw history unless separately needed.

## 6. Cross-rail saga

Payments, booking, voice and proof cannot be made truly atomic across independent providers.

Kal Se Nahi therefore uses compensating transactions:

```
PREPARE
 → validate Charter + proof
 → execute/capture
 → arrange fulfilment
 → verify
 → close

if fulfilment fails after capture:
 → RECONCILIATION_REQUIRED
 → block duplicate debit
 → refund/compensate
 → close as REFUNDED
```

The current prototype already simulates this failure path and idempotency.

## 7. Why this architecture generalizes

Only the Charter schema and attestation issuer change.

Fitness:
- goal: class/gym
- proof: QR attendance / exercise session

Study:
- goal: 60-minute study block
- proof: approved LMS/session attestation

Savings:
- goal: monthly saving commitment
- proof: consented account/payment event

The rails remain:
- voice for negotiation;
- payments for delegated action;
- maps/logistics where physical feasibility matters;
- proof rail for outcome closure.
