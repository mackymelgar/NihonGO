import { describe, it, expect } from 'vitest';
import { computeUnlocks, areaProgress, type UnlockQuest } from './unlock';
import { levelForXp, xpForLevel, levelProgress } from './xp';

const areas = [
  { id: 'A1', sort_order: 0 },
  { id: 'A2', sort_order: 1 },
];

const quests: UnlockQuest[] = [
  { id: 'q1', area_id: 'A1', required_quest_id: null, quest_type: 'main', sort_order: 0 },
  { id: 'q2', area_id: 'A1', required_quest_id: 'q1', quest_type: 'main', sort_order: 1 },
  { id: 'boss1', area_id: 'A1', required_quest_id: 'q2', quest_type: 'boss', sort_order: 2 },
  { id: 'q3', area_id: 'A2', required_quest_id: null, quest_type: 'main', sort_order: 0 },
];

describe('computeUnlocks', () => {
  it('opens the first area and its first quest only', () => {
    const r = computeUnlocks({ areas, quests, completedQuestIds: new Set() });
    expect(r.areaUnlocked.get('A1')).toBe(true);
    expect(r.areaUnlocked.get('A2')).toBe(false);
    expect(r.questUnlocked.get('q1')).toBe(true);
    expect(r.questUnlocked.get('q2')).toBe(false);
    expect(r.questUnlocked.get('q3')).toBe(false);
  });

  it('unlocks the next quest once the prerequisite is done', () => {
    const r = computeUnlocks({ areas, quests, completedQuestIds: new Set(['q1']) });
    expect(r.questUnlocked.get('q2')).toBe(true);
    expect(r.questUnlocked.get('boss1')).toBe(false);
  });

  it('unlocks the next area only after the boss is passed', () => {
    const before = computeUnlocks({ areas, quests, completedQuestIds: new Set(['q1', 'q2']) });
    expect(before.areaUnlocked.get('A2')).toBe(false);

    const after = computeUnlocks({
      areas,
      quests,
      completedQuestIds: new Set(['q1', 'q2', 'boss1']),
    });
    expect(after.areaUnlocked.get('A2')).toBe(true);
    expect(after.questUnlocked.get('q3')).toBe(true);
  });
});

describe('areaProgress', () => {
  it('counts non-side quests', () => {
    const p = areaProgress('A1', quests, new Set(['q1']));
    expect(p.total).toBe(3);
    expect(p.done).toBe(1);
  });
});

describe('xp curve', () => {
  it('levels on the sqrt curve', () => {
    expect(levelForXp(0)).toBe(1);
    expect(levelForXp(100)).toBe(2);
    expect(levelForXp(400)).toBe(3);
    expect(xpForLevel(3)).toBe(400);
  });
  it('reports progress within a level', () => {
    const p = levelProgress(150);
    expect(p.level).toBe(2);
    expect(p.intoLevel).toBe(50);
    expect(p.span).toBe(300); // 400 - 100
  });
});
