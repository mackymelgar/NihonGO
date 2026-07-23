import { describe, it, expect } from 'vitest';
import { updateSkillScore, weakestSkill, deriveMasteryState, applyReview } from './mastery';
import type { UserItemMasteryRow } from './database.types';

describe('updateSkillScore', () => {
  it('moves toward 100 on correct (EMA 0.30)', () => {
    expect(updateSkillScore(0, true)).toBe(30);
    expect(updateSkillScore(30, true)).toBe(51);
  });
  it('drops to 65% on wrong', () => {
    expect(updateSkillScore(100, false)).toBe(65);
  });
  it('clamps to 0..100', () => {
    expect(updateSkillScore(0, false)).toBe(0);
    expect(updateSkillScore(100, true)).toBe(100);
  });
});

describe('weakestSkill', () => {
  it('returns the lowest-scoring skill', () => {
    expect(
      weakestSkill({ reading_score: 80, writing_score: 40, listening_score: 90, speaking_score: 70 }),
    ).toBe('writing');
  });
});

describe('deriveMasteryState', () => {
  it('new when never studied', () => {
    expect(deriveMasteryState({ stage: 0, consecutiveWrong: 0, avgScore: 0, everStudied: false })).toBe('new');
  });
  it('weak overrides on 2+ consecutive wrong', () => {
    expect(deriveMasteryState({ stage: 5, consecutiveWrong: 2, avgScore: 90, everStudied: true })).toBe('weak');
  });
  it('mastered needs stage 6 AND avg ≥ 80', () => {
    expect(deriveMasteryState({ stage: 6, consecutiveWrong: 0, avgScore: 85, everStudied: true })).toBe('mastered');
    expect(deriveMasteryState({ stage: 6, consecutiveWrong: 0, avgScore: 70, everStudied: true })).toBe('strong');
  });
  it('maps stages to states', () => {
    expect(deriveMasteryState({ stage: 1, consecutiveWrong: 0, avgScore: 0, everStudied: true })).toBe('learning');
    expect(deriveMasteryState({ stage: 3, consecutiveWrong: 0, avgScore: 0, everStudied: true })).toBe('familiar');
    expect(deriveMasteryState({ stage: 5, consecutiveWrong: 0, avgScore: 0, everStudied: true })).toBe('strong');
  });
});

const baseRow: UserItemMasteryRow = {
  user_id: 'u',
  item_id: 'i',
  state: 'learning',
  reading_score: 30,
  writing_score: 0,
  listening_score: 0,
  speaking_score: 0,
  srs_stage: 2,
  consecutive_correct: 1,
  consecutive_wrong: 0,
  total_correct: 1,
  total_wrong: 0,
  next_review_at: null,
  last_reviewed_at: null,
  unlocked_at: '',
};

describe('applyReview', () => {
  const now = new Date('2026-07-09T00:00:00Z');

  it('advances stage and updates trained skills on correct', () => {
    const out = applyReview(baseRow, { correct: true, skills: ['reading'] }, now);
    expect(out.srs_stage).toBe(3);
    expect(out.reading_score).toBe(51);
    expect(out.writing_score).toBe(0);
    expect(out.consecutive_correct).toBe(2);
    expect(out.state).toBe('familiar');
  });

  it('drops stage and marks weak after repeated wrong', () => {
    const wrongOnce = applyReview({ ...baseRow, consecutive_wrong: 1 }, { correct: false, skills: ['reading'] }, now);
    expect(wrongOnce.srs_stage).toBe(1);
    expect(wrongOnce.consecutive_wrong).toBe(2);
    expect(wrongOnce.state).toBe('weak');
  });
});
