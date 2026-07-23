/** Shared zod schemas for admin content authoring + CSV import validation.
 * Enums are declared inline so zod infers proper literal-union types (matching
 * the ContentStatus/ItemType/... unions) rather than plain `string`. */
import { z } from 'zod';

const statusEnum = z.enum(['draft', 'ready_for_review', 'published', 'archived']);
const questTypeEnum = z.enum(['main', 'side', 'boss', 'review', 'daily']);
const itemTypeEnum = z.enum(['kana', 'vocabulary', 'grammar', 'kanji', 'phrase']);
const stepTypeEnum = z.enum(['explanation', 'example', 'practice']);
const activityTypeEnum = z.enum([
  'multiple_choice',
  'match_pair',
  'listen_and_choose',
  'fill_in_blank',
  'sentence_builder',
  'typing',
  'flashcard',
  'speaking',
]);
const skillEnum = z.enum(['reading', 'writing', 'listening', 'speaking']);

const slug = z
  .string()
  .min(1, 'Required')
  .regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers and hyphens only');

export const courseSchema = z.object({
  slug,
  title: z.string().min(1, 'Required'),
  description: z.string().nullish(),
  status: statusEnum,
  sort_order: z.coerce.number().int().min(0),
});
export type CourseForm = z.infer<typeof courseSchema>;

export const areaSchema = z.object({
  course_id: z.string().uuid(),
  slug,
  title: z.string().min(1, 'Required'),
  subtitle: z.string().nullish(),
  description: z.string().nullish(),
  theme_icon: z.string().nullish(),
  theme_color: z.string().nullish(),
  status: statusEnum,
  sort_order: z.coerce.number().int().min(0),
});
export type AreaForm = z.infer<typeof areaSchema>;

export const questSchema = z.object({
  area_id: z.string().uuid(),
  slug,
  title: z.string().min(1, 'Required'),
  description: z.string().nullish(),
  learning_goal: z.string().nullish(),
  quest_type: questTypeEnum,
  difficulty: z.coerce.number().int().min(1).max(5),
  estimated_minutes: z.coerce.number().int().min(1),
  xp_reward: z.coerce.number().int().min(0),
  badge_id: z.string().uuid().nullish(),
  pass_threshold: z.coerce.number().min(0).max(1),
  required_quest_id: z.string().uuid().nullish(),
  skills_trained: z.array(skillEnum).min(1),
  status: statusEnum,
  sort_order: z.coerce.number().int().min(0),
});
export type QuestForm = z.infer<typeof questSchema>;

export const lessonStepSchema = z.object({
  step_type: stepTypeEnum,
  title: z.string().nullish(),
  body_md: z.string().nullish(),
  japanese_text: z.string().nullish(),
  kana_reading: z.string().nullish(),
  romaji: z.string().nullish(),
  english_meaning: z.string().nullish(),
  tts_text: z.string().nullish(),
  activity_id: z.string().uuid().nullish(),
  sort_order: z.coerce.number().int().min(0),
});
export type LessonStepForm = z.infer<typeof lessonStepSchema>;

export const learningItemSchema = z.object({
  item_type: itemTypeEnum,
  japanese_text: z.string().min(1, 'Required'),
  kana_reading: z.string().min(1, 'Required'),
  romaji: z.string().min(1, 'Required'),
  english_meaning: z.string().min(1, 'Required'),
  explanation_md: z.string().nullish(),
  example_japanese: z.string().nullish(),
  example_kana: z.string().nullish(),
  example_romaji: z.string().nullish(),
  example_english: z.string().nullish(),
  tts_text: z.string().min(1, 'Required — kana only'),
  jlpt_level: z.coerce.number().int().min(1).max(5).nullish(),
  difficulty: z.coerce.number().int().min(1).max(5),
  onyomi: z.string().nullish(),
  kunyomi: z.string().nullish(),
  stroke_count: z.coerce.number().int().min(0).nullish(),
  radical: z.string().nullish(),
  mnemonic_md: z.string().nullish(),
  tags: z.array(z.string()).default([]),
  status: statusEnum,
});
export type LearningItemForm = z.infer<typeof learningItemSchema>;

export const activitySchema = z.object({
  quest_id: z.string().uuid().nullish(),
  item_id: z.string().uuid().nullish(),
  activity_type: activityTypeEnum,
  skills: z.array(skillEnum).min(1, 'Pick at least one skill'),
  prompt_md: z.string().min(1, 'Required'),
  japanese_text: z.string().nullish(),
  kana_reading: z.string().nullish(),
  romaji: z.string().nullish(),
  tts_text: z.string().nullish(),
  correct_answer: z.string().nullish(),
  accepted_answers: z.array(z.string()).default([]),
  sentence_tokens: z.array(z.string()).nullish(),
  distractor_tokens: z.array(z.string()).default([]),
  explanation_md: z.string().nullish(),
  status: statusEnum,
  sort_order: z.coerce.number().int().min(0),
});
export type ActivityForm = z.infer<typeof activitySchema>;

export const activityChoiceSchema = z.object({
  label: z.string().min(1, 'Required'),
  is_correct: z.boolean().default(false),
  match_key: z.string().nullish(),
  sort_order: z.coerce.number().int().min(0),
});
export type ActivityChoiceForm = z.infer<typeof activityChoiceSchema>;

export const badgeSchema = z.object({
  slug,
  title: z.string().min(1, 'Required'),
  description: z.string().min(1, 'Required'),
  icon_emoji: z.string().min(1, 'Required'),
  status: statusEnum,
});
export type BadgeForm = z.infer<typeof badgeSchema>;

/** Row schema for CSV item import — same as learningItemSchema minus status
 * (imported rows always land as drafts). */
export const itemImportRowSchema = learningItemSchema.omit({ status: true });
export type ItemImportRow = z.infer<typeof itemImportRowSchema>;
