import { describe, test, expect } from 'bun:test';
import { addDays } from 'date-fns';
import { calculateCreditCost, advanceCycle, CYCLE_DAYS } from './credits';
import { DEFAULT_CREDIT_WEIGHTS } from '../modules/plans/plans.defaults';

const KB = 1024;
const MB = 1024 * 1024;

describe('calculateCreditCost', () => {
  const text = { credits: 1, perUnitBytes: 100 * KB };

  test('charges a minimum of one unit', () => {
    expect(calculateCreditCost(text, 0)).toBe(1);
    expect(calculateCreditCost(text, 1)).toBe(1);
  });

  test('charges per started unit', () => {
    expect(calculateCreditCost(text, 100 * KB)).toBe(1);
    expect(calculateCreditCost(text, 100 * KB + 1)).toBe(2);
    expect(calculateCreditCost(text, 250 * KB)).toBe(3);
  });

  test('scales with the weight multiplier', () => {
    expect(calculateCreditCost({ credits: 2, perUnitBytes: 5 * MB }, 12 * MB)).toBe(6);
  });

  // Reads the seeded weights so the rates quoted in docs/pricing can't drift
  test('seeded rates: 1 credit per 100KB of text, 1 per 5MB of audio', () => {
    expect(calculateCreditCost(DEFAULT_CREDIT_WEIGHTS.text, 100 * KB)).toBe(1);
    expect(calculateCreditCost(DEFAULT_CREDIT_WEIGHTS.audio, 25 * MB)).toBe(5);
    expect(calculateCreditCost(DEFAULT_CREDIT_WEIGHTS.audio, 100 * MB)).toBe(20);
  });
});

describe('advanceCycle', () => {
  const now = new Date('2026-07-12T00:00:00Z');

  test('advances one cycle when the period just lapsed', () => {
    const end = addDays(now, -1);
    const cycle = advanceCycle(end, now);

    expect(cycle.start).toEqual(end);
    expect(cycle.end).toEqual(addDays(end, CYCLE_DAYS));
    expect(cycle.end.getTime()).toBeGreaterThan(now.getTime());
  });

  // A months-lapsed subscription must land on a period covering now, or credits re-zero every request
  test('skips every whole cycle already elapsed', () => {
    const end = addDays(now, -185);
    const cycle = advanceCycle(end, now);

    expect(cycle.end.getTime()).toBeGreaterThan(now.getTime());
    expect(cycle.start.getTime()).toBeLessThanOrEqual(now.getTime());
    expect(cycle.end.getTime() - cycle.start.getTime()).toBe(CYCLE_DAYS * 24 * 60 * 60 * 1000);
  });
});
