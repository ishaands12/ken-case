/** Integer minor units only: avoids floating point rounding at the policy boundary. */
export function isPaise(value) {
  return Number.isSafeInteger(value) && value >= 0 && value <= 10000000;
}

export function isTime(value) {
  return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

/** A same-start/end quiet window is disabled; supports windows crossing midnight. */
export function isQuietHour(localTime, start, end) {
  if (![localTime, start, end].every(isTime)) return true;
  if (start === end) return false;
  return start < end ? localTime >= start && localTime < end : localTime >= start || localTime < end;
}

export function istTime(iso) {
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) throw new Error('Invalid time');
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(date);
}

export function money(paise) {
  if (!isPaise(paise)) throw new Error('Invalid amount');
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: paise % 100 ? 2 : 0 }).format(paise / 100);
}
