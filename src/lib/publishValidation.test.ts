import { describe, it, expect } from 'vitest';
import { validateQuestForPublish, hasBlockingErrors } from './publishValidation';
import type { ActivityRow, LessonStepRow, QuestRow } from './database.types';

const quest = (over: Partial<QuestRow> = {}): QuestRow =>
  ({
    id: 'q1',
    area_id: 'a1',
    slug: 'q',
    title: 'Q',
    description: null,
    learning_goal: null,
    quest_type: 'main',
    difficulty: 1,
    estimated_minutes: 5,
    xp_reward: 50,
    badge_id: null,
    pass_threshold: 0.8,
    required_quest_id: null,
    skills_trained: ['reading'],
    status: 'draft',
    sort_order: 0,
    created_at: '',
    updated_at: '',
    deleted_at: null,
    ...over,
  }) as QuestRow;

const step = (over: Partial<LessonStepRow>): LessonStepRow =>
  ({
    id: 's1',
    quest_id: 'q1',
    step_type: 'explanation',
    title: null,
    body_md: null,
    japanese_text: null,
    kana_reading: null,
    romaji: null,
    english_meaning: null,
    tts_text: null,
    activity_id: null,
    sort_order: 0,
    created_at: '',
    updated_at: '',
    deleted_at: null,
    ...over,
  }) as LessonStepRow;

const activity = (over: Partial<ActivityRow>): ActivityRow =>
  ({
    id: 'act1',
    quest_id: 'q1',
    item_id: null,
    activity_type: 'multiple_choice',
    skills: ['reading'],
    prompt_md: 'x',
    japanese_text: null,
    kana_reading: null,
    romaji: null,
    tts_text: null,
    correct_answer: null,
    accepted_answers: [],
    sentence_tokens: null,
    distractor_tokens: [],
    explanation_md: null,
    status: 'published',
    sort_order: 0,
    created_at: '',
    updated_at: '',
    deleted_at: null,
    ...over,
  }) as ActivityRow;

describe('validateQuestForPublish', () => {
  it('flags empty quests', () => {
    const issues = validateQuestForPublish({ quest: quest(), steps: [], activities: [], questItemCount: 0 });
    expect(hasBlockingErrors(issues)).toBe(true);
    expect(issues.some((i) => i.message.includes('no lesson steps'))).toBe(true);
  });

  it('requires kana + tts on Japanese steps', () => {
    const issues = validateQuestForPublish({
      quest: quest(),
      steps: [step({ step_type: 'example', japanese_text: 'あ', kana_reading: null, tts_text: null })],
      activities: [activity({})],
      questItemCount: 1,
    });
    expect(issues.some((i) => i.message.includes('missing kana'))).toBe(true);
  });

  it('blocks draft practice activities', () => {
    const issues = validateQuestForPublish({
      quest: quest(),
      steps: [step({ step_type: 'practice', activity_id: 'act1' })],
      activities: [activity({ status: 'draft' })],
      questItemCount: 1,
    });
    expect(issues.some((i) => i.message.includes('still a draft'))).toBe(true);
  });

  it('passes a complete quest', () => {
    const issues = validateQuestForPublish({
      quest: quest(),
      steps: [
        step({ step_type: 'explanation', body_md: 'hi' }),
        step({ step_type: 'practice', activity_id: 'act1' }),
      ],
      activities: [activity({ status: 'published' })],
      questItemCount: 2,
    });
    expect(hasBlockingErrors(issues)).toBe(false);
  });

  it('treats missing items as warning for boss quests', () => {
    const issues = validateQuestForPublish({
      quest: quest({ quest_type: 'boss' }),
      steps: [step({ step_type: 'practice', activity_id: 'act1' })],
      activities: [activity({})],
      questItemCount: 0,
    });
    expect(hasBlockingErrors(issues)).toBe(false);
    expect(issues.some((i) => i.level === 'warning')).toBe(true);
  });
});
