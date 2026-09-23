export type Mode = 'recovery' | 'stake' | 'none';
export interface Charter {
  version: number; name: string; routine: string; days: string[]; time: string; flexibilityMinutes: number; fallbackMinutes: number;
  mode: Mode; autonomy: 'L2' | 'L3'; budgetPaise: number; maxActionPaise: number; stakePaise: number; weeklyStakeCapPaise: number;
  language: 'en-IN' | 'hi-IN'; quietStart: string; quietEnd: string; active: boolean; paused: boolean; healthPaused: boolean;
  evidenceSources: string[]; allowedActionIds: string[]; address: string;
}
export interface ActionOption { id: string; title: string; description: string; amountPaise: number; durationMinutes: number; merchant: string; category: string; kind: 'booking' | 'fallback' }
export interface Message { id: string; role: 'agent' | 'user'; text: string; at: string; source?: string }
export interface AuditEvent { id: string; at: string; type: string; title: string; detail: string; charterVersion: number; simulated: boolean }
export interface Receipt { id: string; episodeId: string; actionId: string; amountPaise: number; status: string; merchant: string; at: string; simulated: boolean }
export interface AppState {
  revision: number; environment: 'demo'; demoNow: string; charter: Charter;
  episode: { id: string; status: string; evidence: string; reason: string; selectedActionId: string | null; checkInSent: boolean; snoozed: boolean; bookingStatus: string | null; proof: string | null; fault: string | null };
  grant: { id: string; active: boolean; charterVersion: number; mode: Mode; expiresAt: string } | null;
  spentPaise: number; stakeSpentPaise: number; actions: ActionOption[]; messages: Message[]; audit: AuditEvent[]; receipts: Receipt[];
  rails: { id: string; name: string; status: string; detail: string; configured: boolean }[];
  planner: string;
}
export interface Command { type: string; [key: string]: unknown }
