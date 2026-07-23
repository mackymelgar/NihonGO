import { describe, it, expect } from 'vitest';
import { localDateString, formatDateTime } from './dates';

describe('localDateString', () => {
  it('returns the local calendar date in YYYY-MM-DD', () => {
    // 2026-01-01T02:00Z is still Dec 31 in New York (UTC-5)
    const d = new Date('2026-01-01T02:00:00Z');
    expect(localDateString('America/New_York', d)).toBe('2025-12-31');
    expect(localDateString('Asia/Tokyo', d)).toBe('2026-01-01'); // UTC+9
  });

  it('handles UTC', () => {
    const d = new Date('2026-07-07T12:00:00Z');
    expect(localDateString('UTC', d)).toBe('2026-07-07');
  });
});

describe('formatDateTime', () => {
  it('formats without throwing', () => {
    const out = formatDateTime('2026-07-07T12:00:00Z', 'UTC', { dateStyle: 'short' });
    expect(typeof out).toBe('string');
    expect(out.length).toBeGreaterThan(0);
  });
});
