import { randomUUID } from 'node:crypto';
import { isPaise, isTime, isQuietHour, istTime, money } from './utils.mjs';

const DEMO_NOW = '2026-09-23T12:45:00.000Z';
export const CATALOG = Object.freeze([
  { id: 'home-reset', title: 'Make it a small one', description: 'Your agreed 20-minute home session. No travel, no extra spend.', amountPaise: 0, durationMinutes: 20, merchant: 'Your own space', category: 'home', kind: 'fallback' },
  { id: 'partner-class', title: 'A spot to start again', description: 'One 20-minute restart session at your approved demo studio.', amountPaise: 18000, durationMinutes: 20, merchant: 'Neighbourhood Studio (demo)', category: 'fitness', kind: 'booking' },
]);
const uid = () => randomUUID();
function episode(status = 'PROTECTED') {
  return { id: uid(), status, evidence: 'unknown', reason: '', selectedActionId: null, checkInSent: false, snoozed: false, bookingStatus: null, proof: null, fault: null };
}
export function initialState() {
  return {
    revision: 0, environment: 'demo', demoNow: DEMO_NOW,
    charter: { version: 0, name: 'Ishaan', routine: 'Gym', days: ['Mon', 'Wed', 'Fri'], time: '19:00', flexibilityMinutes: 90, fallbackMinutes: 20, mode: 'recovery', autonomy: 'L2', budgetPaise: 30000, maxActionPaise: 20000, stakePaise: 5000, weeklyStakeCapPaise: 15000, language: 'en-IN', quietStart: '22:00', quietEnd: '08:00', active: false, paused: false, healthPaused: false, evidenceSources: ['calendar', 'attendance', 'self_report'], allowedActionIds: ['home-reset', 'partner-class'], address: '' },
    episode: episode(), grant: null, spentPaise: 0, stakeSpentPaise: 0,
    actions: structuredClone(CATALOG), receipts: [], audit: [],
    messages: [{ id: uid(), role: 'agent', text: 'A promise to yourself deserves a little room. Tell me the gym routine you want to keep, and decide how much help feels right. Your agreement comes first.', at: DEMO_NOW }],
    rails: [], planner: 'Local rule-based agent',
  };
}
export function addAudit(state, type, title, detail) {
  state.audit.push({ id: uid(), at: new Date().toISOString(), type, title, detail, charterVersion: state.charter.version, simulated: true });
}
export function say(state, text, source = 'policy') {
  state.messages.push({ id: uid(), role: 'agent', text, at: new Date().toISOString(), source });
}
function invalid(message) { const e = new Error(message); e.statusCode = 400; throw e; }
function block(state, detail) {
  addAudit(state, 'blocked', 'Action held', detail);
  say(state, detail);
  return false;
}
function available(state, { quiet = true, health = true } = {}) {
  const c = state.charter;
  if (!c.active) return block(state, 'Save your agreement first so I know what you want me to do.');
  if (c.paused) return block(state, 'Your agreement is paused. Resume it when you are ready.');
  if (health && c.healthPaused) return block(state, 'Movement actions are paused while you rest. Only you can clear this pause in your agreement.');
  if (state.episode.snoozed) return block(state, 'You asked for space in this episode. I will wait; use a new demo scenario when you want to continue.');
  if (quiet && isQuietHour(istTime(state.demoNow), c.quietStart, c.quietEnd)) return block(state, 'It is inside your quiet hours. No session or payment will be arranged now.');
  return true;
}
function validateGrant(state, mode) {
  const g = state.grant;
  if (!g?.active || g.charterVersion !== state.charter.version || g.mode !== mode || new Date(g.expiresAt) <= new Date(state.demoNow)) {
    return block(state, 'There is no current permission for this money mode. Review the agreement and authorise its demo allowance. Nothing has been charged.');
  }
  return true;
}
function actionPolicy(state, action) {
  if (!available(state)) return false;
  if (!state.charter.allowedActionIds.includes(action.id)) return block(state, 'That action is outside the options you approved. Change your agreement before choosing it.');
  if (['AMBIGUOUS', 'RECONCILIATION_REQUIRED'].includes(state.episode.status)) return block(state, 'This episode needs clarification before I can arrange another action. No money will move.');
  if (action.amountPaise > 0) {
    if (!['verified_miss', 'self_reported_lapse'].includes(state.episode.evidence)) return block(state, 'A possible conflict or missing signal does not establish a lapse. No paid restart will be arranged.');
    if (state.charter.mode !== 'recovery') return block(state, 'Paid restart actions need Recovery Credit mode. Your current mode does not authorise them.');
    if (!validateGrant(state, 'recovery')) return false;
    if (action.amountPaise > state.charter.maxActionPaise) return block(state, `This session costs ${money(action.amountPaise)}, above your ${money(state.charter.maxActionPaise)} per-action limit. You can choose the free home session.`);
    if (state.spentPaise + action.amountPaise > state.charter.budgetPaise) return block(state, 'Your remaining demo allowance does not cover this session. The free home session is still available.');
  }
  return true;
}
function hasAction(state) {
  return state.episode.bookingStatus || state.receipts.some(r => r.episodeId === state.episode.id && r.actionId !== 'commitment-stake');
}
function executeAction(state, action) {
  if (hasAction(state)) return block(state, 'An action already exists for this episode. I will not charge or book it twice.');
  if (!actionPolicy(state, action)) return false;
  addAudit(state, 'decision', 'Permission checked', `${action.title}; ${money(action.amountPaise)}; agreement v${state.charter.version}; ${state.charter.autonomy}; evidence ${state.episode.evidence}.`);
  if (action.amountPaise > 0 && state.episode.fault === 'payment_failure') {
    state.episode.status = 'PAYMENT_FAILED';
    addAudit(state, 'payment', 'Demo payment declined', 'Injected provider decline. No debit or booking was created.');
    say(state, 'The demo payment was declined. Your allowance is unchanged. You can choose the free home session.');
    return false;
  }
  if (action.amountPaise > 0) {
    const receipt = { id: `demo_${uid()}`, episodeId: state.episode.id, actionId: action.id, amountPaise: action.amountPaise, status: 'captured', merchant: action.merchant, at: new Date().toISOString(), simulated: true };
    state.receipts.push(receipt);
    state.spentPaise += action.amountPaise;
    addAudit(state, 'payment', 'Demo payment recorded', `${money(action.amountPaise)} to ${action.merchant}. Receipt ${receipt.id}. No real funds moved.`);
    if (state.episode.fault === 'order_failure') {
      state.episode.status = 'RECONCILIATION_REQUIRED'; state.episode.bookingStatus = 'failed';
      addAudit(state, 'exception', 'Booking needs reconciliation', 'Payment captured in simulation, booking failed. A second debit is blocked.');
      say(state, 'The demo payment went through, but the studio did not confirm the booking. I have held this case. Reconcile it to issue the simulated refund; I will not charge again.');
      return false;
    }
  }
  state.episode.status = 'ARRANGED';
  state.episode.bookingStatus = action.kind === 'booking' ? 'confirmed' : 'ready';
  addAudit(state, 'action', action.kind === 'booking' ? 'Demo session arranged' : 'Small session ready', `${action.title}; ${action.kind === 'fallback' ? state.charter.fallbackMinutes : action.durationMinutes} minutes. Completion still needs evidence.`);
  say(state, action.kind === 'booking' ? `Your restart session is arranged in the demo for ${money(action.amountPaise)}. A booking is just a beginning; I will keep completion separate until you report back or the demo attendance signal arrives.` : `Your ${state.charter.fallbackMinutes}-minute home session is ready. Use the routine you already know. When you return, tell me how it went. No money involved.`);
  return true;
}
function applyStake(state) {
  if (!available(state) || !validateGrant(state, 'stake')) return;
  if (state.episode.evidence !== 'verified_miss') return block(state, 'A stake requires a verified miss. Uncertain evidence cannot trigger it.');
  if (state.receipts.some(r => r.episodeId === state.episode.id)) return;
  const amount = state.charter.stakePaise;
  if (state.stakeSpentPaise + amount > state.charter.weeklyStakeCapPaise) return block(state, 'This stake would exceed the weekly limit. No consequence was applied.');
  state.stakeSpentPaise += amount;
  state.receipts.push({ id: `demo_stake_${uid()}`, episodeId: state.episode.id, actionId: 'commitment-stake', amountPaise: amount, status: 'simulated_stake', merchant: 'Demo consequence ledger — no recipient', at: new Date().toISOString(), simulated: true });
  addAudit(state, 'stake', 'Separate demo stake applied', `${money(amount)} against the explicit Commitment Stake agreement; verified simulated miss. No donation, recipient or real transfer.`);
  say(state, `The verified demo miss triggered your separate ${money(amount)} stake rule. This is a simulated consequence only. Your Recovery Credit was not used. You can still choose the free home session.`);
}
function saveCharter(state, value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalid('An agreement is required.');
  const keys = ['name', 'routine', 'days', 'time', 'flexibilityMinutes', 'fallbackMinutes', 'mode', 'autonomy', 'budgetPaise', 'maxActionPaise', 'stakePaise', 'weeklyStakeCapPaise', 'language', 'quietStart', 'quietEnd', 'evidenceSources', 'allowedActionIds', 'address'];
  const c = { ...state.charter };
  for (const key of keys) if (Object.hasOwn(value, key)) c[key] = value[key];
  for (const key of ['name', 'routine', 'address']) if (typeof c[key] !== 'string' || c[key].length > (key === 'address' ? 300 : 80)) invalid(`Invalid ${key}.`);
  if (!c.name.trim() || !c.routine.trim()) invalid('Your name and routine cannot be empty.');
  c.name = c.name.trim(); c.routine = c.routine.trim();
  for (const key of ['time', 'quietStart', 'quietEnd']) if (!isTime(c[key])) invalid(`Use HH:MM for ${key}.`);
  for (const key of ['budgetPaise', 'maxActionPaise', 'stakePaise', 'weeklyStakeCapPaise']) if (!isPaise(c[key])) invalid(`Invalid ${key}; use a non-negative whole amount in paise.`);
  if (c.maxActionPaise > c.budgetPaise) invalid('Per-action limit cannot exceed your total allowance.');
  if (c.budgetPaise < state.spentPaise) invalid('Your new allowance cannot be less than the amount already used.');
  if (c.stakePaise > c.weeklyStakeCapPaise) invalid('Per-miss stake cannot exceed its weekly cap.');
  if (c.weeklyStakeCapPaise < state.stakeSpentPaise) invalid('Your weekly cap cannot be less than demo stakes already recorded.');
  if (!['recovery', 'stake', 'none'].includes(c.mode) || !['L2', 'L3'].includes(c.autonomy) || !['hi-IN', 'en-IN'].includes(c.language)) invalid('Invalid mode, autonomy or language.');
  if (!Number.isInteger(c.fallbackMinutes) || c.fallbackMinutes < 1 || c.fallbackMinutes > 60 || !Number.isInteger(c.flexibilityMinutes) || c.flexibilityMinutes < 0 || c.flexibilityMinutes > 180) invalid('Use a fallback of 1–60 minutes and flexibility of 0–180 minutes.');
  const lists = { days: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'], evidenceSources: ['calendar','attendance','self_report','buddy'], allowedActionIds: CATALOG.map(a => a.id) };
  for (const [key, allowed] of Object.entries(lists)) {
    if (!Array.isArray(c[key]) || !c[key].every(v => allowed.includes(v)) || new Set(c[key]).size !== c[key].length || c[key].length > allowed.length) invalid(`Invalid ${key}.`);
  }
  if (!c.days.length || !c.allowedActionIds.length) invalid('Choose at least one day and one permitted action.');
  c.version++; c.active = true;
  state.charter = c;
  if (state.grant) state.grant.active = false;
  // The new contract never grants authority through an old staged confirmation.
  if (state.episode.status === 'CONFIRMATION_REQUIRED') { state.episode.status = 'REENTRY_READY'; state.episode.selectedActionId = null; }
  state.actions = structuredClone(CATALOG).map(a => a.id === 'home-reset' ? { ...a, durationMinutes: c.fallbackMinutes, description: `Your agreed ${c.fallbackMinutes}-minute home session. No travel, no extra spend.` } : a);
  addAudit(state, 'agreement', 'Agreement saved', `Version ${c.version}; ${c.routine} ${c.days.join('/')} at ${c.time} IST; ${c.mode}; ${c.autonomy}. Any previous money permission was invalidated.`);
  say(state, `Your ${c.routine.toLowerCase()} time is ${c.time} on ${c.days.join(', ')}. If the day changes, we have a ${c.fallbackMinutes}-minute fallback. ${c.mode === 'none' ? 'No money actions are enabled.' : 'Review the allowance and authorise it separately when you are ready.'}`);
}
function simulate(state, scenario) {
  const scenarios = ['conflict','verified_miss','ambiguous','injury','clear','payment_failure','order_failure','quiet_hours'];
  if (!scenarios.includes(scenario)) invalid('Unknown demo scenario.');
  if (state.episode.status === 'RECONCILIATION_REQUIRED') return block(state, 'Reconcile the outstanding booking before starting another episode.');
  if (!state.charter.active || state.charter.paused) return block(state, 'Save and activate your agreement before running a demo scenario.');
  state.demoNow = scenario === 'quiet_hours' ? '2026-09-23T18:00:00.000Z' : DEMO_NOW;
  state.episode = episode();
  addAudit(state, 'observation', 'Demo scenario received', `${scenario}; synthetic signal, demo clock ${istTime(state.demoNow)} IST. This is not a real calendar or attendance feed.`);
  if (scenario === 'injury') {
    state.charter.healthPaused = true; state.episode.status = 'HEALTH_PAUSED';
    say(state, 'Thanks for saying so. Movement and spending are paused while you rest. You can clear the pause yourself when you are ready.');
    return;
  }
  if (scenario === 'quiet_hours') { state.episode.status = 'QUIET_HOURS'; state.episode.reason = 'Demo event arrived at 23:30 IST.'; available(state); return; }
  if (!available(state)) { state.episode.status = 'HEALTH_PAUSED'; return; }
  if (scenario === 'clear') { state.episode.reason = 'No conflict in the simulated calendar.'; say(state, 'Your slot is clear in this demo. Your original plan stays in place.'); return; }
  if (scenario === 'conflict') {
    if (!state.charter.evidenceSources.includes('calendar')) return block(state, 'Calendar signals are not enabled in your agreement. This simulated signal was ignored.');
    state.episode.status = 'FALLBACK_OFFERED'; state.episode.reason = 'A college project meeting overlaps your gym slot.'; state.episode.evidence = 'conflict';
    state.episode.checkInSent = true;
    say(state, `Your demo project meeting overlaps your ${state.charter.time} gym slot. Would your ${state.charter.fallbackMinutes}-minute home session fit today? You can also ask me to leave it for now.`);
    return;
  }
  if (scenario === 'ambiguous') {
    state.episode.status = 'AMBIGUOUS'; state.episode.reason = 'Attendance signals disagree. A missing check-in is not proof of a miss.'; state.episode.evidence = 'unknown'; state.episode.checkInSent = true;
    say(state, 'The demo attendance signals disagree. I cannot tell whether you made it, so I have held all money actions. You can tell me what happened, or leave it here.');
    addAudit(state, 'blocked', 'Ambiguity blocks money', 'No inferred miss, no payment and no stake.'); return;
  }
  if (!state.charter.evidenceSources.includes('attendance')) return block(state, 'Attendance signals are not enabled. The simulated verified-miss signal was ignored.');
  state.episode.evidence = 'verified_miss'; state.episode.status = 'REENTRY_READY'; state.episode.checkInSent = true;
  state.episode.reason = 'A confirmed missed session was injected for the demonstration.';
  state.episode.fault = ['payment_failure','order_failure'].includes(scenario) ? scenario : null;
  say(state, 'One quiet day does not close the door. The demo confirms a missed session. Shall we make the next step a home session, or a spot at your approved studio?');
  if (state.charter.mode === 'stake') {
    state.episode.status = 'VERIFIED_MISS';
    if (state.charter.autonomy === 'L3') applyStake(state);
    else say(state, 'Your stake experiment is set to L2. No consequence will run automatically; this build keeps L2 stake execution disabled. You can try L3 with a separate explicit demo permission.');
  } else if (state.charter.autonomy === 'L3' && state.charter.mode === 'recovery') {
    const action = CATALOG.find(a => a.id === 'partner-class'); state.episode.selectedActionId = action.id; executeAction(state, action);
  }
}

/** All side-effect decisions are deterministic. This reducer never invokes live financial tools. */
export function reduce(previous, command) {
  if (!command || typeof command !== 'object' || typeof command.type !== 'string') invalid('A command type is required.');
  if (command.type === 'RESET_DEMO') return initialState();
  const state = structuredClone(previous);
  const c = state.charter;
  switch (command.type) {
    case 'SAVE_CHARTER': saveCharter(state, command.charter); break;
    case 'AUTHORIZE': {
      if (command.accepted !== true) invalid('Explicit acceptance is required.');
      if (!c.active || c.paused || c.healthPaused) { block(state, 'Save an active agreement and clear any pause before authorising.'); break; }
      if (c.mode === 'none') { block(state, 'No-money mode does not need a financial permission.'); break; }
      state.grant = { id: `demo_grant_${uid()}`, active: true, charterVersion: c.version, mode: c.mode, expiresAt: '2026-10-23T18:29:59.000Z' };
      addAudit(state, 'consent', 'Demo permission granted', `Explicit acceptance; ${c.mode}; agreement v${c.version}; ${c.autonomy}; ${c.mode === 'stake' ? money(c.stakePaise) + '/miss, ' + money(c.weeklyStakeCapPaise) + '/week' : money(c.maxActionPaise) + '/action, ' + money(c.budgetPaise) + '/demo month'}. Allowed actions ${c.allowedActionIds.join(', ')}. No real payment mandate.`);
      say(state, `Your ${c.mode === 'stake' ? 'Commitment Stake' : 'Recovery Credit'} demo permission is active. ${c.autonomy === 'L3' ? 'I may act inside this exact agreement when evidence is clear.' : 'I will ask before each action.'} No real money is connected.`); break;
    }
    case 'REVOKE': if (state.grant) state.grant.active = false; c.active = false; state.episode.status = state.episode.status === 'RECONCILIATION_REQUIRED' ? state.episode.status : 'PAUSED'; addAudit(state, 'consent', 'Permission revoked', 'Future observation and action stopped. Historical receipts remain visible.'); say(state, 'Permission revoked. I have stopped future actions. Your past activity remains available.'); break;
    case 'PAUSE': c.paused = true; addAudit(state, 'consent', 'Agreement paused', 'No new observation or action until resumed.'); say(state, 'Paused. Take the space you need.'); break;
    case 'RESUME': if (!c.active) { block(state, 'This agreement was revoked or has not been saved. Save it again to resume.'); break; } c.paused = false; addAudit(state, 'consent', 'Agreement resumed', 'Existing health pause and money permissions are unchanged.'); say(state, 'Your agreement is active again. The same limits still apply.'); break;
    case 'HEALTH_PAUSE': if (typeof command.paused !== 'boolean') invalid('Health pause must be true or false.'); c.healthPaused = command.paused; addAudit(state, 'consent', command.paused ? 'Rest pause enabled' : 'Rest pause cleared by user', 'Health pause can only be changed explicitly.'); say(state, command.paused ? 'Movement actions are paused. Rest comes first.' : 'Rest pause cleared. Your other permissions still apply.'); break;
    case 'SIMULATE': simulate(state, command.scenario); break;
    case 'SELECT_ACTION': {
      const action = CATALOG.find(a => a.id === command.actionId);
      if (!action) invalid('Unknown action.');
      if (hasAction(state) && !(state.episode.status === 'VERIFIED_MISS' && action.amountPaise === 0)) { block(state, 'This episode already has an action or receipt. Finish it before starting another.'); break; }
      if (!['FALLBACK_OFFERED','REENTRY_READY','VERIFIED_MISS','CONFIRMATION_REQUIRED','PAYMENT_FAILED'].includes(state.episode.status)) { block(state, 'Start a relevant demo scenario or tell me about your missed session first.'); break; }
      if (!actionPolicy(state, action)) break;
      state.episode.selectedActionId = action.id;
      state.episode.status = 'CONFIRMATION_REQUIRED';
      addAudit(state, 'decision', 'Next step proposed', `${action.title} at ${money(action.amountPaise)}. Waiting for confirmation or valid L3 rule.`);
      if (c.autonomy === 'L3' && (action.amountPaise === 0 || state.episode.evidence === 'verified_miss')) executeAction(state, action);
      else say(state, `${action.title}: ${money(action.amountPaise)} with ${action.merchant}. Confirm below to arrange it, or choose “not now”.`);
      break;
    }
    case 'CONFIRM_ACTION': {
      if (state.episode.status !== 'CONFIRMATION_REQUIRED') { block(state, 'There is no pending action to confirm. No additional booking or charge was made.'); break; }
      const action = CATALOG.find(a => a.id === state.episode.selectedActionId);
      if (!action) invalid('The proposed action is no longer available.');
      addAudit(state, 'approval', 'Action explicitly confirmed', `Confirmed ${action.id} for ${money(action.amountPaise)}; rechecking current agreement.`);
      executeAction(state, action); break;
    }
    case 'COMPLETE': {
      if (!['self_report','demo_attendance'].includes(command.source)) invalid('Choose self-report or demo attendance.');
      if (!available(state, { quiet: false })) break;
      if (state.episode.status !== 'ARRANGED') { block(state, 'Only an arranged session can be marked complete. A payment alone never proves completion.'); break; }
      const required = command.source === 'demo_attendance' ? 'attendance' : 'self_report';
      if (!c.evidenceSources.includes(required)) { block(state, 'This evidence source is not enabled in your agreement.'); break; }
      state.episode.status = command.source === 'self_report' ? 'SELF_REPORTED' : 'VERIFIED_RESTART';
      state.episode.proof = command.source;
      addAudit(state, 'outcome', command.source === 'self_report' ? 'Restart self-reported' : 'Restart verified in demo', command.source === 'self_report' ? 'User reported completion; not independently verified.' : 'Synthetic trusted attendance callback. Not proof of a real workout.');
      say(state, command.source === 'self_report' ? 'You made a little room for yourself. I have recorded your restart as self-reported. The next planned session is still there for you.' : 'The demo attendance signal confirms your restart. One small return, then back to your usual plan.'); break;
    }
    case 'SNOOZE': state.episode.snoozed = true; if (state.episode.status !== 'RECONCILIATION_REQUIRED') state.episode.status = 'SNOOZED'; addAudit(state, 'consent', 'User asked for space', 'No further action in this episode. Existing bookings are not silently cancelled.'); say(state, 'Of course. I will leave this episode here. An existing booking, if any, has not been cancelled.'); break;
    case 'RECONCILE': {
      if (state.episode.status !== 'RECONCILIATION_REQUIRED') { block(state, 'No booking needs reconciliation.'); break; }
      const receipt = state.receipts.find(r => r.episodeId === state.episode.id && r.status === 'captured');
      if (!receipt) invalid('No captured receipt found.');
      receipt.status = 'refunded'; state.spentPaise -= receipt.amountPaise; state.episode.status = 'REFUNDED'; state.episode.bookingStatus = 'refunded';
      addAudit(state, 'refund', 'Demo refund reconciled', `${receipt.id}; ${money(receipt.amountPaise)} returned to the simulated allowance. No real refund request.`);
      say(state, 'The simulated refund is reconciled. Your allowance has been restored, and no extra charge was made.'); break;
    }
    case 'CHAT': handleChat(state, command.message); break;
    default: invalid('Unknown command.');
  }
  state.revision++;
  return state;
}

function handleChat(state, message) {
  if (typeof message !== 'string' || !message.trim() || message.length > 1500) invalid('Use a message between 1 and 1,500 characters.');
  state.messages.push({ id: uid(), role: 'user', text: message.trim(), at: new Date().toISOString() });
  const text = message.toLowerCase().trim();
  if (/\b(injur(?:y|ed)?|sick|pain|unwell|hurt|ill)\b/.test(text)) {
    state.charter.healthPaused = true; addAudit(state, 'safety', 'Rest requested in conversation', 'Movement actions stopped; no diagnosis or treatment inferred.'); say(state, 'Let’s make room for rest. I have paused movement actions. You can clear this pause in your agreement when you are ready.'); return;
  }
  if (/^(stop|pause|leave me alone|bas)(\b|[.!])/.test(text)) {
    state.charter.paused = true; addAudit(state, 'consent', 'Paused in conversation', 'User asked to stop.'); say(state, 'Paused. You are in control of when we pick this up.'); return;
  }
  if (/^(not now|later|kal|no thanks)(\b|[.!])/.test(text)) {
    state.episode.snoozed = true; if (state.episode.status !== 'RECONCILIATION_REQUIRED') state.episode.status = 'SNOOZED'; say(state, 'Understood. I will give you space for this episode.'); addAudit(state, 'consent', 'Episode snoozed', 'No follow-up or new action in this episode.'); return;
  }
  if (!available(state, { quiet: false })) return;
  if (/\b(missed|skipped|restart|start again)\b/.test(text) && !hasAction(state) && !/\b(not|never|didn't|did not|haven't|have not)\b/.test(text)) {
    if (!state.charter.evidenceSources.includes('self_report')) { block(state, 'Self-report evidence is not enabled. You can enable it in your agreement.'); return; }
    state.episode.evidence = 'self_reported_lapse'; state.episode.status = 'REENTRY_READY';
    addAudit(state, 'observation', 'Lapse self-reported', 'User described a lapse; not an independently verified miss. No automatic payment.');
    say(state, `Thanks for telling me. We can make the return small: your ${state.charter.fallbackMinutes}-minute home session, or an approved studio spot. Choose below; I will confirm any cost first.`); return;
  }
  if (/\b(done|finished|completed|went)\b/.test(text)) { say(state, 'Good to hear. Use “I did it” on your arranged session to record this as your own report. I keep that separate from independently verified attendance.'); return; }
  if (/\b(book|pay|yes|confirm|haan)\b/.test(text)) { say(state, 'Choose the exact session below and use its confirmation button. That keeps the action, price and your permission clear.'); return; }
  say(state, 'I can help you make room for your next session, find a smaller restart, or pause things for a while. Tell me what got in the way, or try a scenario in the demo lab.', 'conversation');
}
