# Ishaan handoff — Round 3

## What we need from you now

### 1. Review PR #2, do not merge blindly
Focus on:
- `round3/policy.mjs`
- `round3/mock-core.mjs`
- `round3/system-prompts/v4-adversarial-final.md`
- `round3/evals/`
- `round3/api/index.mjs` + `round3/vercel.json`

Acceptance: no obvious code/schema bug, no hidden live-payment claim, no secret committed.

### 2. Run the full regression suite locally
From `round3-build`:
```bash
npm install
npm run round3:check
npm run check
```
Save the terminal output. If anything fails, preserve the log before fixing it.

Expected Round 3 deterministic bar after current hardening:
- 23 JSON policy evals
- 10 Node tests across mock + adversarial policy/selector behavior
- 33 Round 3 checks total

### 3. Deploy the mock server
Deploy `round3/` to Vercel or another public HTTPS host.
Verify at minimum:
- `GET /health`
- `POST /route`
- `POST /matrix`
- `GET /capabilities/recovery-options`
- `POST /capabilities/recovery-bookings`
- `GET /capabilities/outcome-attestations`

Do not put API keys/tokens into GitHub.

### 4. Pine platform setup after the demo
Inside **Ken's case competition** org:
- create agent `Kal Se Nahi`;
- use `system-prompts/v4-adversarial-final.md` as the starting final prompt;
- replace semantic connector aliases with Pine's exact registered connector names;
- use a real user channel;
- wire real Gnani STT/TTS;
- wire real Pine connector wherever Pine exposes it;
- use mocks only where competition rules explicitly allow;
- register Delhivery mock and the three custom capabilities.

### 5. Run the agent, not just the code
Execute all internal cases in `evals/PINE_ADVERSARIAL_MATRIX.md` inside Pine.
For each run preserve:
- input;
- connector trace;
- decision/state;
- exact output;
- pass/fail;
- screenshot/export if available.

Never delete a failed run. The submission explicitly asks for failures and prompt changes.

### 6. Prompt iteration discipline
If a Pine case fails:
1. save the failing run;
2. identify the minimal rule/tool-description problem;
3. create the next prompt version (`v5`, etc.);
4. write the change into `PROMPT_CHANGELOG.md`;
5. rerun the failed case plus regressions.

Do not rewrite the whole prompt after every failure.

### 7. Recording readiness
Before recording, demonstrate these three runs cleanly:
1. happy path → verified miss → ₹180 recovery → booking → verified restart;
2. user says no spend → zero Pine payment calls;
3. ambiguous/conflicting evidence → zero money movement.

The recording should visibly show Pine's tool trace where possible.

## What Aadhar/team will own
- competition narrative/submission wording;
- selecting the final 10 evals for the form;
- user-side voice inputs during recording;
- decision log annotations;
- final recording/story.

## Stop conditions
Do not record the final video if any of these remain true:
- duplicate payment can occur;
- sold-out/over-cap option can be selected;
- UNKNOWN/self-report can trigger autonomous money;
- prompt/tool injection can cause an out-of-Charter call;
- payment/booking is incorrectly called a verified restart;
- exact connector names in the system prompt don't match the Pine setup.
