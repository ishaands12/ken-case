const MONEY_ACTIONS = new Set(['book_paid_recovery', 'apply_stake']);

export const DEFAULT_CHARTER = Object.freeze({
  user: 'Aadhar',
  goalId: 'strength_class_fri_1900',
  goalLabel: 'Friday 7 PM strength class',
  charterVersion: 4,
  autonomy: 'L3',
  moneyMode: 'recovery',
  maxActionPaise: 20000,
  remainingBudgetPaise: 30000,
  quietStart: '22:00',
  quietEnd: '08:00',
  allowedActions: ['free_home_reset', 'book_paid_recovery'],
  evidenceSources: ['partner_attendance', 'self_report', 'route'],
  fallbackMinutes: 20,
  grant: { active: true, charterVersion: 4, mode: 'recovery', expiresAt: '2026-10-31T18:29:59.000Z' },
});

function inQuietHours(localHHMM, start, end) {
  if (!localHHMM) return false;
  if (start < end) return localHHMM >= start && localHHMM < end;
  return localHHMM >= start || localHHMM < end;
}

export function evaluateAction(input) {
  const c = { ...DEFAULT_CHARTER, ...(input.charter || {}) };
  const action = input.action;
  const amountPaise = input.amountPaise || 0;
  const evidence = input.evidence || 'unknown';
  const explicitUserConstraint = input.userConstraint || null;

  if (input.healthConcern) return { allow: false, state: 'HEALTH_PAUSED', rule: 'R2', reason: 'Health concern pauses movement and spending.' };
  if (input.paused || input.revoked) return { allow: false, state: 'PAUSED', rule: 'R3', reason: 'User pause or revocation overrides all future actions.' };
  if (inQuietHours(input.localTime, c.quietStart, c.quietEnd)) return { allow: false, state: 'QUIET_HOURS', rule: 'R4', reason: 'No new intervention or spend inside quiet hours.' };
  if (input.unresolvedTransaction) return { allow: false, state: 'RECONCILIATION_REQUIRED', rule: 'R8', reason: 'Reconcile an uncertain/captured transaction before any retry.' };
  if (explicitUserConstraint === 'no_spend' && amountPaise > 0) return { allow: false, state: 'REENTRY_READY', rule: 'R1', reason: 'Current explicit user instruction narrows the Charter: no money.' };
  if (!c.allowedActions.includes(action)) return { allow: false, state: 'BLOCKED', rule: 'R5', reason: 'Action is outside the allow-list.' };

  if (MONEY_ACTIONS.has(action) || amountPaise > 0) {
    if (evidence !== 'verified_miss') return { allow: false, state: evidence === 'unknown' ? 'AMBIGUOUS' : 'REENTRY_READY', rule: 'R6', reason: 'Self-report, missing data, or ambiguity cannot autonomously move money.' };
    if (!c.grant?.active || c.grant.charterVersion !== c.charterVersion || c.grant.mode !== c.moneyMode) return { allow: false, state: 'BLOCKED', rule: 'R7', reason: 'Financial grant is absent, stale, or for a different money mode.' };
    if (amountPaise > c.maxActionPaise) return { allow: false, state: 'REENTRY_READY', rule: 'R7', reason: 'Price exceeds per-action cap.' };
    if (amountPaise > c.remainingBudgetPaise) return { allow: false, state: 'REENTRY_READY', rule: 'R7', reason: 'Insufficient authorised budget.' };
  }

  if (input.routeFeasible === false && action === 'keep_original_plan') return { allow: false, state: 'AT_RISK', rule: 'R9', reason: 'Physical feasibility evidence rules out the original plan.' };

  return { allow: true, state: action === 'free_home_reset' ? 'FALLBACK_OFFERED' : 'ACTION_AUTHORISED', rule: amountPaise > 0 ? 'R7' : 'R10', reason: 'Action is inside the current Charter and evidence threshold.' };
}

export function chooseRecoveryOption({ options, routeByOption = {}, charter = DEFAULT_CHARTER }) {
  const allowed = options
    .filter(o => charter.allowedActions.includes(o.action || 'book_paid_recovery'))
    .filter(o => o.pricePaise <= charter.maxActionPaise && o.pricePaise <= charter.remainingBudgetPaise)
    .filter(o => routeByOption[o.id]?.feasible !== false)
    .sort((a, b) => (a.startMinutesFromNow - b.startMinutesFromNow) || (a.pricePaise - b.pricePaise));
  return allowed[0] || null;
}
