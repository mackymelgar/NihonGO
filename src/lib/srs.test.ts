import { describe, it, expect } from 'vitest';
import { nextStage, nextReviewAt, isForgotten, isDue, SRS_INTERVAL_MS, WRONG_INTERVAL_MS } from './srs';

describe('nextStage', () => {
  it('advances on correct, caps at 6', () => {
    expect(nextStage(1, true)).toBe(2);
    expect(nextStage(6, true)).toBe(6);
  });
  it('drops by 2 on wrong, floors at 1', () => {
    expect(nextStage(4, false)).toBe(2);
    expect(nextStage(2, false)).toBe(1);
    expect(nextStage(1, false)).toBe(1);
  });
});

describe('nextReviewAt', () => {
  const now = new Date('2026-07-09T00:00:00Z');
  it('uses the stage interval when correct', () => {
    expect(nextReviewAt(2, true, now).getTime()).toBe(now.getTime() + SRS_INTERVAL_MS[2]);
  });
  it('always 4h when wrong', () => {
    expect(nextReviewAt(1, false, now).getTime()).toBe(now.getTime() + WRONG_INTERVAL_MS);
  });
});

describe('isForgotten', () => {
  const now = new Date('2026-07-09T00:00:00Z');
  it('true when overdue > 2x interval', () => {
    const due = new Date(now.getTime() - 3 * SRS_INTERVAL_MS[2]); // stage 2 = 1d, 3d overdue
    expect(isForgotten(2, due, now)).toBe(true);
  });
  it('false when only slightly overdue', () => {
    const due = new Date(now.getTime() - SRS_INTERVAL_MS[2] / 2);
    expect(isForgotten(2, due, now)).toBe(false);
  });
  it('false for new items', () => {
    expect(isForgotten(0, null, now)).toBe(false);
  });
});

describe('isDue', () => {
  const now = new Date('2026-07-09T00:00:00Z');
  it('true at/after due time', () => {
    expect(isDue(new Date(now.getTime() - 1), now)).toBe(true);
    expect(isDue(new Date(now.getTime() + 1000), now)).toBe(false);
    expect(isDue(null, now)).toBe(false);
  });
});
