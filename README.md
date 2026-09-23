# Kal Se Nahi

Kal Se Nahi is a local competition prototype for **GoalGuard’s re-entry mode**: a person misses a movement session, the agent offers the smallest agreed next step, and it only uses a pre-approved demo allowance when evidence and permission are clear.

The current build is designed to be honest in a judge demo:

- Gnani text-to-speech can be connected with your own account key.
- Payments, Grantex consent, class booking, attendance and refunds are simulated locally and labelled in the product.
- The agent uses deterministic policy rules for consent and money decisions. An optional local Ollama model can improve conversation wording but has no tool or payment authority.

## Run it

Requires Node 22.13+. The built interface loads React and icons from a browser module CDN, so opening it also needs internet access. `npm install` is only needed when Vite is not already available on your machine.

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:4317](http://127.0.0.1:4317). The app listens only on your computer.

To run the production build:

```bash
npm run build
npm start
```

## Try the demo

1. Create an agreement for a gym routine and save it.
2. Review and explicitly authorise the simulated agreement.
3. Open **Explore the demo** and choose “A confirmed missed session.”
4. Select a small home session or a simulated studio session, then confirm it.
5. Mark it self-reported or add simulated attendance proof. Open **Activity** to see the complete reason, permission, receipt and result trail.

The demo lab also covers ambiguous proof, quiet hours, rest, payment failure and a captured-payment/failed-booking reconciliation.

## Connect Gnani voice

Create `.env` from `.env.example`, then set `GNANI_API_KEY` to a Speech API key from the Gnani dashboard. Restart the server. “Listen with Gnani” sends only the selected on-screen agent reply to Gnani and may consume account credits. The browser never receives the key. See [the connection guide](docs/RAILS.md).

## Verification

```bash
npm test
npm run check
```

The test suite covers 43 policy, persistence and rail-adapter cases. It never uses a live Gnani key or tries to initiate a payment.

## Project map

- `server/engine.mjs` — the permission and recovery state machine.
- `server/store.mjs` — local SQLite state and idempotent command ledger.
- `server/rails.mjs` — the optional Gnani TTS adapter and clearly scoped rail status.
- `src/` — the companion interface.
- `docs/RAILS.md` — exact live versus simulated capability boundaries.
