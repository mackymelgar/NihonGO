/** Shared content-domain constants: enum option lists, labels, and the
 * activity → default-skill matrix. Used by the admin CMS and (later) the
 * learner quiz engine. */
import type {
  ActivityType,
  ContentStatus,
  ItemType,
  QuestType,
  SkillType,
  StepType,
} from './database.types';

export const CONTENT_STATUSES: ContentStatus[] = [
  'draft',
  'ready_for_review',
  'published',
  'archived',
];

export const STATUS_LABELS: Record<ContentStatus, string> = {
  draft: 'Draft',
  ready_for_review: 'Ready for review',
  published: 'Published',
  archived: 'Archived',
};

export const QUEST_TYPES: QuestType[] = ['main', 'side', 'boss', 'review', 'daily'];

export const ITEM_TYPES: ItemType[] = ['kana', 'vocabulary', 'grammar', 'kanji', 'phrase'];

export const STEP_TYPES: StepType[] = ['explanation', 'example', 'practice'];

export const ACTIVITY_TYPES: ActivityType[] = [
  'multiple_choice',
  'match_pair',
  'listen_and_choose',
  'fill_in_blank',
  'sentence_builder',
  'typing',
  'flashcard',
  'speaking',
];

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  multiple_choice: 'Multiple choice',
  match_pair: 'Match pairs',
  listen_and_choose: 'Listen & choose',
  fill_in_blank: 'Fill in the blank',
  sentence_builder: 'Sentence builder',
  typing: 'Typing',
  flashcard: 'Flashcard',
  speaking: 'Speaking',
};

export const SKILL_TYPES: SkillType[] = ['reading', 'writing', 'listening', 'speaking'];

/** Default skills an activity type trains (§7.4). Admins can override per activity. */
export const ACTIVITY_DEFAULT_SKILLS: Record<ActivityType, SkillType[]> = {
  multiple_choice: ['reading'],
  match_pair: ['reading'],
  listen_and_choose: ['listening'],
  fill_in_blank: ['reading'],
  sentence_builder: ['reading', 'writing'],
  typing: ['reading', 'writing'],
  flashcard: ['reading'],
  speaking: ['speaking'],
};

/** Which authoring fields matter for each activity type (drives editor UI). */
export const ACTIVITY_FIELDS: Record<
  ActivityType,
  { choices: boolean; matchKeys: boolean; tokens: boolean; typedAnswer: boolean; audio: boolean }
> = {
  multiple_choice: { choices: true, matchKeys: false, tokens: false, typedAnswer: false, audio: false },
  match_pair: { choices: true, matchKeys: true, tokens: false, typedAnswer: false, audio: false },
  listen_and_choose: { choices: true, matchKeys: false, tokens: false, typedAnswer: false, audio: true },
  fill_in_blank: { choices: true, matchKeys: false, tokens: false, typedAnswer: true, audio: false },
  sentence_builder: { choices: false, matchKeys: false, tokens: true, typedAnswer: false, audio: false },
  typing: { choices: false, matchKeys: false, tokens: false, typedAnswer: true, audio: false },
  flashcard: { choices: false, matchKeys: false, tokens: false, typedAnswer: false, audio: true },
  speaking: { choices: false, matchKeys: false, tokens: false, typedAnswer: true, audio: true },
};

/** kebab-case a title into a slug candidate. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}
