import test from 'node:test';
import assert from 'node:assert/strict';
import { isPaise, isTime, isQuietHour, istTime, money } from '../server/utils.mjs';

test('paise accepts bounded integers, including zero and both boundary amounts', () => {
  for (const amount of [0, 1, 10000000]) assert.equal(isPaise(amount), true);
  for (const amount of [-1, 10000001, NaN, Infinity, -Infinity, 50.5, '123', null, undefined, true, Number.MAX_SAFE_INTEGER]) {
    assert.equal(isPaise(amount), false, `Reject ${String(amount)}`);
  }
});

test('time requires a valid, zero-padded 24-hour HH:mm string', () => {
  for (const value of ['00:00', '09:05', '12:30', '23:59']) assert.equal(isTime(value), true);
  for (const value of ['24:00', '12:60', '9:05', '09:5', '13:59a', '13-59', '13.59', '13:59 ', ' 13:59', '13:59\n', '\n13:59', '', null, 1200]) {
    assert.equal(isTime(value), false, `Reject ${String(value)}`);
  }
});

test('quiet hours include the start and exclude the end of same-day windows', () => {
  assert.equal(isQuietHour('08:59', '09:00', '17:00'), false);
  assert.equal(isQuietHour('09:00', '09:00', '17:00'), true);
  assert.equal(isQuietHour('16:59', '09:00', '17:00'), true);
  assert.equal(isQuietHour('17:00', '09:00', '17:00'), false);
});

test('quiet hours preserve boundaries when the window crosses midnight', () => {
  for (const value of ['23:00', '23:59', '00:00', '00:59']) assert.equal(isQuietHour(value, '23:00', '01:00'), true);
  for (const value of ['22:59', '01:00', '12:00']) assert.equal(isQuietHour(value, '23:00', '01:00'), false);
  assert.equal(isQuietHour('23:59', '23:59', '00:00'), true);
  assert.equal(isQuietHour('00:00', '23:59', '00:00'), false);
});

test('equal quiet-hour endpoints disable the window; malformed inputs fail closed', () => {
  for (const value of ['00:00', '12:00', '23:59']) assert.equal(isQuietHour(value, '12:00', '12:00'), false);
  assert.equal(isQuietHour('24:00', '23:00', '01:00'), true);
  assert.equal(isQuietHour('00:00', '24:00', '01:00'), true);
  assert.equal(isQuietHour('00:00', '23:00', '24:00'), true);
  assert.equal(isQuietHour(null, '12:00', '12:00'), true);
});

test('IST conversion adds five hours thirty minutes, including the date boundary', () => {
  assert.equal(istTime('2026-09-22T00:00:00Z'), '05:30');
  assert.equal(istTime('2026-09-22T18:29:00Z'), '23:59');
  assert.equal(istTime('2026-09-22T18:30:00Z'), '00:00');
  assert.equal(istTime('2026-09-22T23:59:59Z'), '05:29');
  assert.equal(istTime('2026-09-23T18:15:00+05:30'), '18:15');
  assert.throws(() => istTime('invalid'), /Invalid time/);
});

test('money displays rupees with Indian grouping and preserves nonzero paise', () => {
  assert.equal(money(0), '₹0');
  assert.equal(money(1), '₹0.01');
  assert.equal(money(50), '₹0.50');
  assert.equal(money(100), '₹1');
  assert.equal(money(1234567), '₹12,345.67');
  assert.equal(money(10000000), '₹1,00,000');
  for (const amount of [-1, 10000001, NaN, Infinity, 1.5, '100', null]) {
    assert.throws(() => money(amount), /Invalid amount/);
  }
});
