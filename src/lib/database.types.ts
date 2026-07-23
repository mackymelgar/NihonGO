/**
 * Hand-written schema types for Nihongo Hero. Mirrors supabase/migrations/0001_init.sql.
 * Regenerate the canonical version once the migration is live:
 *
 *   npm run gen:types
 *
 * NB: these MUST be `type` aliases, not `interface`s — interfaces have no
 * implicit index signature and so fail supabase-js's `extends GenericSchema`
 * constraint, silently degrading every query to `never`.
 */

// ---------- ENUMS ----------
export type ContentStatus = 'draft' | 'ready_for_review' | 'published' | 'archived';
export type QuestType = 'main' | 'side' | 'boss' | 'review' | 'daily';
export type ItemType = 'kana' | 'vocabulary' | 'grammar' | 'kanji' | 'phrase';
export type StepType = 'explanation' | 'example' | 'practice';
export type ActivityType =
  | 'multiple_choice'
  | 'match_pair'
  | 'listen_and_choose'
  | 'fill_in_blank'
  | 'sentence_builder'
  | 'typing'
  | 'flashcard'
  | 'speaking';
export type MasteryState =
  | 'new'
  | 'learning'
  | 'weak'
  | 'familiar'
  | 'strong'
  | 'mastered'
  | 'forgotten';
export type SkillType = 'reading' | 'writing' | 'listening' | 'speaking';
export type UserRole = 'learner' | 'admin' | 'content_reviewer';
export type LearningGoal =
  | 'from_zero'
  | 'travel'
  | 'anime_manga'
  | 'jlpt'
  | 'work'
  | 'developer'
  | 'daily_speech';

// ---------- ROW TYPES ----------
export type ProfileRow = {
  id: string;
  display_name: string;
  avatar_emoji: string;
  role: UserRole;
  goal: LearningGoal | null;
  timezone: string;
  romaji_enabled: boolean;
  furigana_enabled: boolean;
  daily_new_item_limit: number;
  daily_review_limit: number;
  tts_rate: number;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};
export type ProfileUpdate = Partial<Omit<ProfileRow, 'id' | 'created_at' | 'updated_at'>>;

export type UserStatsRow = {
  user_id: string;
  total_xp: number;
  level: number;
  current_streak: number;
  longest_streak: number;
  last_active_date: string | null;
  lessons_completed: number;
  reviews_completed: number;
  updated_at: string;
};

export type CourseRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  status: ContentStatus;
  sort_order: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type AreaRow = {
  id: string;
  course_id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  theme_icon: string | null;
  theme_color: string | null;
  status: ContentStatus;
  sort_order: number;
  is_premium: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type QuestRow = {
  id: string;
  area_id: string;
  slug: string;
  title: string;
  description: string | null;
  learning_goal: string | null;
  quest_type: QuestType;
  difficulty: number;
  estimated_minutes: number;
  xp_reward: number;
  badge_id: string | null;
  pass_threshold: number;
  required_quest_id: string | null;
  skills_trained: SkillType[];
  status: ContentStatus;
  sort_order: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type LessonStepRow = {
  id: string;
  quest_id: string;
  step_type: StepType;
  title: string | null;
  body_md: string | null;
  japanese_text: string | null;
  kana_reading: string | null;
  romaji: string | null;
  english_meaning: string | null;
  tts_text: string | null;
  activity_id: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type LearningItemRow = {
  id: string;
  item_type: ItemType;
  japanese_text: string;
  kana_reading: string;
  romaji: string;
  english_meaning: string;
  explanation_md: string | null;
  example_japanese: string | null;
  example_kana: string | null;
  example_romaji: string | null;
  example_english: string | null;
  tts_text: string;
  jlpt_level: number | null;
  difficulty: number;
  onyomi: string | null;
  kunyomi: string | null;
  stroke_count: number | null;
  radical: string | null;
  mnemonic_md: string | null;
  tags: string[];
  status: ContentStatus;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type QuestItemRow = {
  quest_id: string;
  item_id: string;
  sort_order: number;
};

export type ActivityRow = {
  id: string;
  quest_id: string | null;
  item_id: string | null;
  activity_type: ActivityType;
  skills: SkillType[];
  prompt_md: string;
  japanese_text: string | null;
  kana_reading: string | null;
  romaji: string | null;
  tts_text: string | null;
  correct_answer: string | null;
  accepted_answers: string[];
  sentence_tokens: string[] | null;
  distractor_tokens: string[];
  explanation_md: string | null;
  status: ContentStatus;
  sort_order: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type ActivityChoiceRow = {
  id: string;
  activity_id: string;
  label: string;
  is_correct: boolean;
  match_key: string | null;
  sort_order: number;
};

export type BadgeRow = {
  id: string;
  slug: string;
  title: string;
  description: string;
  icon_emoji: string;
  status: ContentStatus;
  created_at: string;
  deleted_at: string | null;
};

export type UserBadgeRow = {
  user_id: string;
  badge_id: string;
  earned_at: string;
};

export type UserQuestProgressRow = {
  user_id: string;
  quest_id: string;
  status: 'in_progress' | 'completed' | 'failed';
  current_step_index: number;
  score: number | null;
  attempts: number;
  started_at: string;
  completed_at: string | null;
};

export type UserItemMasteryRow = {
  user_id: string;
  item_id: string;
  state: MasteryState;
  reading_score: number;
  writing_score: number;
  listening_score: number;
  speaking_score: number;
  srs_stage: number;
  consecutive_correct: number;
  consecutive_wrong: number;
  total_correct: number;
  total_wrong: number;
  next_review_at: string | null;
  last_reviewed_at: string | null;
  unlocked_at: string;
};

export type AnswerLogRow = {
  id: number;
  user_id: string;
  activity_id: string | null;
  item_id: string | null;
  quest_id: string | null;
  context: 'lesson' | 'review' | 'boss' | 'daily';
  activity_type: ActivityType;
  skills: SkillType[];
  is_correct: boolean;
  user_answer: string | null;
  response_ms: number | null;
  answered_at: string;
};

export type DailyQuestRow = {
  user_id: string;
  quest_date: string;
  lessons_target: number;
  reviews_target: number;
  lessons_done: number;
  reviews_done: number;
  completed_at: string | null;
  xp_reward: number;
};

export type AnalyticsEventRow = {
  id: number;
  user_id: string | null;
  event_name: string;
  payload: Record<string, unknown>;
  created_at: string;
};

// ---------- RPC RESULTS ----------
export type UnlockedRef = { id: string; slug: string; title: string };
export type CompleteQuestResult = {
  xp_earned: number;
  leveled_up: boolean;
  new_level: number;
  total_xp: number;
  badge: { id: string; slug: string; title: string; icon_emoji: string } | null;
  unlocked_quests: UnlockedRef[];
  unlocked_areas: UnlockedRef[];
  already_completed: boolean;
};

export type SubmitReviewResult = {
  item_id: string;
  state: MasteryState;
  srs_stage: number;
  reading_score: number;
  writing_score: number;
  listening_score: number;
  speaking_score: number;
  next_review_at: string;
  xp_earned: number;
};

export type DashboardResult = {
  stats: {
    total_xp: number;
    level: number;
    current_streak: number;
    longest_streak: number;
    lessons_completed: number;
    reviews_completed: number;
  };
  daily: {
    lessons_target: number;
    reviews_target: number;
    lessons_done: number;
    reviews_done: number;
    completed: boolean;
    xp_reward: number;
    just_completed: boolean;
  };
  due_total: number;
  due_by_type: Record<string, number>;
  weakest_skill: SkillType | null;
  weakest_score: number | null;
  weekly: { date: string; count: number }[];
};

export type BossMissedItem = {
  item_id: string;
  activity_id: string;
  prompt: string;
  japanese: string | null;
  skills: SkillType[];
};
export type BossAttemptResult = {
  score: number;
  passed: boolean;
  total: number;
  correct: number;
  attempts: number;
  missed: BossMissedItem[];
  missed_item_ids: string[];
  completion: CompleteQuestResult | null;
};

// ---------- TABLE HELPER ----------
type Table<Row, Required extends keyof Row> = {
  Row: Row;
  Insert: Partial<Row> & Pick<Row, Required>;
  Update: Partial<Row>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: Partial<ProfileRow> & { id: string };
        Update: ProfileUpdate;
        Relationships: [];
      };
      user_stats: Table<UserStatsRow, 'user_id'>;
      courses: Table<CourseRow, 'slug' | 'title'>;
      areas: Table<AreaRow, 'course_id' | 'slug' | 'title'>;
      quests: Table<QuestRow, 'area_id' | 'slug' | 'title'>;
      lesson_steps: Table<LessonStepRow, 'quest_id' | 'step_type'>;
      learning_items: Table<
        LearningItemRow,
        'item_type' | 'japanese_text' | 'kana_reading' | 'romaji' | 'english_meaning' | 'tts_text'
      >;
      quest_items: Table<QuestItemRow, 'quest_id' | 'item_id'>;
      activities: Table<ActivityRow, 'activity_type' | 'skills' | 'prompt_md'>;
      activity_choices: Table<ActivityChoiceRow, 'activity_id' | 'label'>;
      badges: Table<BadgeRow, 'slug' | 'title' | 'description'>;
      user_badges: Table<UserBadgeRow, 'user_id' | 'badge_id'>;
      user_quest_progress: Table<UserQuestProgressRow, 'user_id' | 'quest_id'>;
      user_item_mastery: Table<UserItemMasteryRow, 'user_id' | 'item_id'>;
      answer_logs: Table<
        AnswerLogRow,
        'user_id' | 'context' | 'activity_type' | 'skills' | 'is_correct'
      >;
      daily_quests: Table<DailyQuestRow, 'user_id' | 'quest_date'>;
      analytics_events: Table<AnalyticsEventRow, 'event_name'>;
    };
    Views: { [_ in never]: never };
    Functions: {
      complete_quest: {
        Args: { p_quest_id: string; p_score?: number };
        Returns: CompleteQuestResult;
      };
      submit_review_result: {
        Args: {
          p_item_id: string;
          p_is_correct: boolean;
          p_skills: SkillType[];
          p_activity_type: ActivityType;
          p_activity_id?: string | null;
          p_response_ms?: number | null;
        };
        Returns: SubmitReviewResult;
      };
      get_dashboard: {
        Args: Record<string, never>;
        Returns: DashboardResult;
      };
      submit_boss_attempt: {
        Args: { p_quest_id: string; p_answers: Record<string, { answer: string | null; client_correct: boolean }> };
        Returns: BossAttemptResult;
      };
    };
    Enums: {
      content_status: ContentStatus;
      quest_type: QuestType;
      item_type: ItemType;
      step_type: StepType;
      activity_type: ActivityType;
      mastery_state: MasteryState;
      skill_type: SkillType;
      user_role: UserRole;
      learning_goal: LearningGoal;
    };
    CompositeTypes: { [_ in never]: never };
  };
};
