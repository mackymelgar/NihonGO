-- ============================================================
-- Nihongo Hero — Full Schema v1
-- Run in the Supabase SQL editor, or: supabase db push
-- ============================================================

-- ---------- ENUMS ----------
create type content_status as enum ('draft', 'ready_for_review', 'published', 'archived');
create type quest_type as enum ('main', 'side', 'boss', 'review', 'daily');
create type item_type as enum ('kana', 'vocabulary', 'grammar', 'kanji', 'phrase');
create type step_type as enum ('explanation', 'example', 'practice');
create type activity_type as enum (
  'multiple_choice', 'match_pair', 'listen_and_choose',
  'fill_in_blank', 'sentence_builder', 'typing', 'flashcard'
);
create type mastery_state as enum (
  'new', 'learning', 'weak', 'familiar', 'strong', 'mastered', 'forgotten'
);
create type skill_type as enum ('reading', 'writing', 'listening', 'speaking');
create type user_role as enum ('learner', 'admin', 'content_reviewer');
create type learning_goal as enum (
  'from_zero', 'travel', 'anime_manga', 'jlpt', 'work', 'developer', 'daily_speech'
);

-- ---------- PROFILES ----------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Hero',
  avatar_emoji text not null default '🦊',
  role user_role not null default 'learner',
  goal learning_goal,
  timezone text not null default 'UTC',
  romaji_enabled boolean not null default true,
  furigana_enabled boolean not null default true,
  daily_new_item_limit int not null default 10,
  daily_review_limit int not null default 100,
  tts_rate numeric not null default 0.9,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- ---------- USER STATS (declared early: referenced by handle_new_user) ----------
create table user_stats (
  user_id uuid primary key references profiles(id) on delete cascade,
  total_xp int not null default 0,
  level int not null default 1,
  current_streak int not null default 0,
  longest_streak int not null default 0,
  last_active_date date,
  lessons_completed int not null default 0,
  reviews_completed int not null default 0,
  updated_at timestamptz not null default now()
);

-- Auto-create profile + stats on signup
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', 'Hero'));
  insert into public.user_stats (user_id) values (new.id);
  return new;
end $$;
create trigger on_auth_user_created
  after insert on auth.users for each row execute function handle_new_user();

-- ---------- CONTENT: COURSE STRUCTURE ----------
create table courses (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  description text,
  status content_status not null default 'draft',
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table areas (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id),
  slug text unique not null,
  title text not null,
  subtitle text,
  description text,
  theme_icon text,
  theme_color text,
  status content_status not null default 'draft',
  sort_order int not null default 0,
  is_premium boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table quests (
  id uuid primary key default gen_random_uuid(),
  area_id uuid not null references areas(id),
  slug text unique not null,
  title text not null,
  description text,
  learning_goal text,
  quest_type quest_type not null default 'main',
  difficulty int not null default 1 check (difficulty between 1 and 5),
  estimated_minutes int not null default 7,
  xp_reward int not null default 50,
  badge_id uuid,
  pass_threshold numeric not null default 0.8,
  required_quest_id uuid references quests(id),
  skills_trained skill_type[] not null default '{reading}',
  status content_status not null default 'draft',
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table lesson_steps (
  id uuid primary key default gen_random_uuid(),
  quest_id uuid not null references quests(id),
  step_type step_type not null,
  title text,
  body_md text,
  japanese_text text,
  kana_reading text,
  romaji text,
  english_meaning text,
  tts_text text,
  activity_id uuid,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- ---------- CONTENT: LEARNING ITEMS ----------
create table learning_items (
  id uuid primary key default gen_random_uuid(),
  item_type item_type not null,
  japanese_text text not null,
  kana_reading text not null,
  romaji text not null,
  english_meaning text not null,
  explanation_md text,
  example_japanese text,
  example_kana text,
  example_romaji text,
  example_english text,
  tts_text text not null,
  jlpt_level int check (jlpt_level between 1 and 5),
  difficulty int not null default 1 check (difficulty between 1 and 5),
  onyomi text,
  kunyomi text,
  stroke_count int,
  radical text,
  mnemonic_md text,
  tags text[] not null default '{}',
  status content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table quest_items (
  quest_id uuid not null references quests(id) on delete cascade,
  item_id uuid not null references learning_items(id) on delete cascade,
  sort_order int not null default 0,
  primary key (quest_id, item_id)
);

-- ---------- CONTENT: PRACTICE ACTIVITIES ----------
create table activities (
  id uuid primary key default gen_random_uuid(),
  quest_id uuid references quests(id),
  item_id uuid references learning_items(id),
  activity_type activity_type not null,
  skills skill_type[] not null,
  prompt_md text not null,
  japanese_text text,
  kana_reading text,
  romaji text,
  tts_text text,
  correct_answer text,
  accepted_answers text[] not null default '{}',
  sentence_tokens text[],
  distractor_tokens text[] not null default '{}',
  explanation_md text,
  status content_status not null default 'draft',
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table activity_choices (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references activities(id) on delete cascade,
  label text not null,
  is_correct boolean not null default false,
  match_key text,
  sort_order int not null default 0
);

alter table lesson_steps add constraint lesson_steps_activity_fk
  foreign key (activity_id) references activities(id);

-- ---------- GAMIFICATION ----------
create table badges (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  description text not null,
  icon_emoji text not null default '🏅',
  status content_status not null default 'published',
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
alter table quests add constraint quests_badge_fk foreign key (badge_id) references badges(id);

create table user_badges (
  user_id uuid not null references profiles(id) on delete cascade,
  badge_id uuid not null references badges(id),
  earned_at timestamptz not null default now(),
  primary key (user_id, badge_id)
);

-- ---------- LEARNER PROGRESS ----------
create table user_quest_progress (
  user_id uuid not null references profiles(id) on delete cascade,
  quest_id uuid not null references quests(id),
  status text not null default 'in_progress' check (status in ('in_progress','completed','failed')),
  current_step_index int not null default 0,
  score numeric,
  attempts int not null default 0,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  primary key (user_id, quest_id)
);

create table user_item_mastery (
  user_id uuid not null references profiles(id) on delete cascade,
  item_id uuid not null references learning_items(id),
  state mastery_state not null default 'new',
  reading_score numeric not null default 0 check (reading_score between 0 and 100),
  writing_score numeric not null default 0 check (writing_score between 0 and 100),
  listening_score numeric not null default 0 check (listening_score between 0 and 100),
  speaking_score numeric not null default 0 check (speaking_score between 0 and 100),
  srs_stage int not null default 0,
  consecutive_correct int not null default 0,
  consecutive_wrong int not null default 0,
  total_correct int not null default 0,
  total_wrong int not null default 0,
  next_review_at timestamptz,
  last_reviewed_at timestamptz,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, item_id)
);
create index idx_mastery_due on user_item_mastery (user_id, next_review_at);

create table answer_logs (
  id bigint generated always as identity primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  activity_id uuid references activities(id),
  item_id uuid references learning_items(id),
  quest_id uuid references quests(id),
  context text not null check (context in ('lesson','review','boss','daily')),
  activity_type activity_type not null,
  skills skill_type[] not null,
  is_correct boolean not null,
  user_answer text,
  response_ms int,
  answered_at timestamptz not null default now()
);
create index idx_answer_logs_user on answer_logs (user_id, answered_at desc);

create table daily_quests (
  user_id uuid not null references profiles(id) on delete cascade,
  quest_date date not null,
  lessons_target int not null default 1,
  reviews_target int not null default 10,
  lessons_done int not null default 0,
  reviews_done int not null default 0,
  completed_at timestamptz,
  xp_reward int not null default 30,
  primary key (user_id, quest_date)
);

create table analytics_events (
  id bigint generated always as identity primary key,
  user_id uuid references profiles(id) on delete set null,
  event_name text not null,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index idx_analytics_event on analytics_events (event_name, created_at desc);

-- ---------- updated_at housekeeping ----------
create or replace function touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger t_profiles_touch       before update on profiles       for each row execute function touch_updated_at();
create trigger t_courses_touch        before update on courses        for each row execute function touch_updated_at();
create trigger t_areas_touch          before update on areas          for each row execute function touch_updated_at();
create trigger t_quests_touch         before update on quests         for each row execute function touch_updated_at();
create trigger t_lesson_steps_touch   before update on lesson_steps   for each row execute function touch_updated_at();
create trigger t_learning_items_touch before update on learning_items for each row execute function touch_updated_at();
create trigger t_activities_touch     before update on activities     for each row execute function touch_updated_at();
create trigger t_user_stats_touch     before update on user_stats     for each row execute function touch_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table profiles            enable row level security;
alter table courses             enable row level security;
alter table areas               enable row level security;
alter table quests              enable row level security;
alter table lesson_steps        enable row level security;
alter table learning_items      enable row level security;
alter table quest_items         enable row level security;
alter table activities          enable row level security;
alter table activity_choices    enable row level security;
alter table badges              enable row level security;
alter table user_badges         enable row level security;
alter table user_stats          enable row level security;
alter table user_quest_progress enable row level security;
alter table user_item_mastery   enable row level security;
alter table answer_logs         enable row level security;
alter table daily_quests        enable row level security;
alter table analytics_events    enable row level security;

create or replace function is_admin() returns boolean language sql stable security definer
set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role in ('admin','content_reviewer'));
$$;

-- ----- Profiles -----
create policy "own profile read"   on profiles for select using (id = auth.uid() or is_admin());
create policy "own profile update" on profiles for update using (id = auth.uid());
create policy "own profile insert" on profiles for insert with check (id = auth.uid());

-- ----- Content tables: published readable by all; admins full access -----
create policy "courses read"  on courses for select using (status = 'published' or is_admin());
create policy "courses write" on courses for all using (is_admin()) with check (is_admin());

create policy "areas read"  on areas for select using (status = 'published' or is_admin());
create policy "areas write" on areas for all using (is_admin()) with check (is_admin());

create policy "quests read"  on quests for select using (status = 'published' or is_admin());
create policy "quests write" on quests for all using (is_admin()) with check (is_admin());

create policy "lesson_steps read"  on lesson_steps for select using (
  is_admin() or exists (
    select 1 from quests q where q.id = lesson_steps.quest_id and q.status = 'published'
  )
);
create policy "lesson_steps write" on lesson_steps for all using (is_admin()) with check (is_admin());

create policy "learning_items read"  on learning_items for select using (status = 'published' or is_admin());
create policy "learning_items write" on learning_items for all using (is_admin()) with check (is_admin());

create policy "quest_items read"  on quest_items for select using (
  is_admin() or exists (
    select 1 from quests q where q.id = quest_items.quest_id and q.status = 'published'
  )
);
create policy "quest_items write" on quest_items for all using (is_admin()) with check (is_admin());

create policy "activities read"  on activities for select using (status = 'published' or is_admin());
create policy "activities write" on activities for all using (is_admin()) with check (is_admin());

create policy "activity_choices read"  on activity_choices for select using (
  is_admin() or exists (
    select 1 from activities a where a.id = activity_choices.activity_id and a.status = 'published'
  )
);
create policy "activity_choices write" on activity_choices for all using (is_admin()) with check (is_admin());

create policy "badges read"  on badges for select using (status = 'published' or is_admin());
create policy "badges write" on badges for all using (is_admin()) with check (is_admin());

-- ----- User-data tables: owner full access, admins read-only -----
create policy "user_badges own"  on user_badges for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "user_badges admin read" on user_badges for select using (is_admin());

create policy "user_stats own"  on user_stats for select using (user_id = auth.uid());
create policy "user_stats admin read" on user_stats for select using (is_admin());
-- NB: mutations to user_stats happen via security-definer RPCs only (no owner write policy).

create policy "uqp own"  on user_quest_progress for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "uqp admin read" on user_quest_progress for select using (is_admin());

create policy "mastery own"  on user_item_mastery for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "mastery admin read" on user_item_mastery for select using (is_admin());

create policy "answer_logs own"  on answer_logs for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "answer_logs admin read" on answer_logs for select using (is_admin());

create policy "daily_quests own"  on daily_quests for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "daily_quests admin read" on daily_quests for select using (is_admin());

-- ----- Analytics: insert own events, admin read -----
create policy "insert own events" on analytics_events for insert with check (user_id = auth.uid());
create policy "admin read events" on analytics_events for select using (is_admin());
