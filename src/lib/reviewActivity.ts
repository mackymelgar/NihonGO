/** Synthesize a review activity from item data so every item can always be
 * reviewed, even with zero authored activities (§5.5). Targets the item's
 * weakest skill. */
import type { ActivityChoiceRow, LearningItemRow, SkillType } from './database.types';
import type { PlayerActivity } from '@/hooks/learner/useQuestPlayer';
import { shuffle } from './utils';
import { speech } from './speech';

function choice(label: string, is_correct: boolean, i: number): ActivityChoiceRow {
  return { id: `synth-choice-${i}`, activity_id: 'synth', label, is_correct, match_key: null, sort_order: i };
}

function baseActivity(item: LearningItemRow, over: Partial<PlayerActivity>): PlayerActivity {
  return {
    id: `synth-${item.id}`,
    quest_id: null,
    item_id: item.id,
    activity_type: 'flashcard',
    skills: ['reading'],
    prompt_md: '',
    japanese_text: null,
    kana_reading: null,
    romaji: null,
    tts_text: item.tts_text,
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
    choices: [],
    ...over,
  };
}

/** Build distractor choices from other items' meanings/readings. */
function distractors(pool: LearningItemRow[], correctId: string, key: 'english_meaning' | 'kana_reading', n = 3) {
  const others = shuffle(pool.filter((p) => p.id !== correctId && p[key]));
  const seen = new Set<string>();
  const out: string[] = [];
  for (const o of others) {
    if (out.length >= n) break;
    if (!seen.has(o[key])) {
      seen.add(o[key]);
      out.push(o[key]);
    }
  }
  return out;
}

/**
 * Generate a review activity for an item, targeting `skill`. `pool` supplies
 * distractors for choice-based activities.
 */
export function generateReviewActivity(
  item: LearningItemRow,
  skill: SkillType,
  pool: LearningItemRow[],
): PlayerActivity {
  // Speaking → say it aloud and get scored (only when the recognizer exists).
  if (skill === 'speaking' && speech.isAvailable()) {
    return baseActivity(item, {
      activity_type: 'speaking',
      skills: ['speaking'],
      prompt_md: 'Say this aloud',
      japanese_text: item.japanese_text,
      correct_answer: item.kana_reading,
    });
  }

  // Listening → hear the audio, choose the meaning.
  if (skill === 'listening') {
    const d = distractors(pool, item.id, 'english_meaning');
    if (d.length >= 2) {
      const choices = shuffle([
        choice(item.english_meaning, true, 0),
        ...d.map((label, i) => choice(label, false, i + 1)),
      ]);
      return baseActivity(item, {
        activity_type: 'listen_and_choose',
        skills: ['listening'],
        prompt_md: 'What did you hear?',
        choices,
      });
    }
    // Fallback: audio flashcard.
    return baseActivity(item, {
      activity_type: 'flashcard',
      skills: ['listening'],
      prompt_md: 'Listen and recall',
      japanese_text: item.japanese_text,
      correct_answer: item.english_meaning,
    });
  }

  // Writing → type the reading.
  if (skill === 'writing') {
    return baseActivity(item, {
      activity_type: 'typing',
      skills: ['reading', 'writing'],
      prompt_md: `Type the reading of ${item.japanese_text}`,
      japanese_text: item.japanese_text,
      correct_answer: item.kana_reading,
      accepted_answers: [item.romaji],
    });
  }

  // Reading (and speaking fallback) → choose the meaning.
  const d = distractors(pool, item.id, 'english_meaning');
  if (d.length >= 2) {
    const choices = shuffle([
      choice(item.english_meaning, true, 0),
      ...d.map((label, i) => choice(label, false, i + 1)),
    ]);
    return baseActivity(item, {
      activity_type: 'multiple_choice',
      skills: ['reading'],
      prompt_md: `What does ${item.japanese_text} mean?`,
      japanese_text: item.japanese_text,
      choices,
    });
  }

  // Last-resort fallback: self-graded flashcard.
  return baseActivity(item, {
    activity_type: 'flashcard',
    skills: ['reading'],
    prompt_md: 'Do you remember this?',
    japanese_text: item.japanese_text,
    correct_answer: `${item.kana_reading} · ${item.english_meaning}`,
  });
}
