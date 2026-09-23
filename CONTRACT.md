# Internal application contract

Local single-user, loopback-only competition demo. Never implies a real rail ran. Source PRD is provided in the conversation; no private survey names in the app.

Frontend: React + TypeScript, lucide-react. Read src/types.ts. GET /api/state returns AppState. POST /api/command body {type,...fields} returns AppState, errors {error}. Frontend must generate requestId via crypto.randomUUID() for mutating commands. No state mutations in client other than form drafts. A failed policy decision normally returns state with agent explanation/audit; invalid input returns 400.

Commands:
- SAVE_CHARTER {charter: editable partial Charter}. Invalidates prior grant; leaves charter active. Controls form, all paise integers.
- AUTHORIZE {accepted:true}. Creates visibly simulated grant for current version/mode, allowed actions/caps. Separate explicit button after summary. Charter must be active.
- REVOKE {}, PAUSE {}, RESUME {}, HEALTH_PAUSE {paused:boolean}.
- SIMULATE {scenario: 'conflict'|'verified_miss'|'ambiguous'|'injury'|'clear'|'payment_failure'|'order_failure'|'quiet_hours'}. The demo lab injects synthetic evidence; every event visibly simulated. Makes a fresh episode unless outstanding reconciliation exists. conflict offers fallback; verified_miss offers restart (or automatically arranges gym if L3+authorized). ambiguous never money. failure scenarios stage a restart with forced rail failure at confirm.
- SELECT_ACTION {actionId:'home-reset'|'partner-class'}. Policy check; L2 stages confirmation. L3 only auto if valid grant, explicit verified miss for paid action.
- CONFIRM_ACTION {}. Explicitly approve staged option; policy rechecked. Demo capture and booking are persisted.
- COMPLETE {source:'self_report'|'demo_attendance'}. Can only complete an arranged action; self_report never verified. demo_attendance is visibly simulated partner proof, accepted only if attendance consented.
- SNOOZE {}. Stops this episode; no charges.
- CHAT {message:string}. Agent interprets simple intent; injury/stop take priority, no money via vague text. Optional Ollama wording if reachable; actions through deterministic policy.
- RECONCILE {}. If captured but booking failed, demo refund exactly once; visible simulated receipt/audit.
- RESET_DEMO {}. Reset sample data only with frontend confirmation dialog.

GET /api/export yields anonymised demo audit JSON attachment. No external sends. Browser speech synthesis is optional read-aloud labelled browser voice; microphone dictation can be supported with explicit browser-speech notice, never called Gnani. /api/rails returns connection status; credentials only environment variables. Live capabilities are documented separately.

Startup state has charter active false, no consent, welcome message; warm onboarding form or banner visible. All UI panes functional: Today, My agreement, Activity, Connections. Demo lab reachable. Simulated clock pinned to Wednesday 23 Sep 2026 18:15 IST; clearly labelled. Agent execution is event-driven (no phantom background monitoring).
