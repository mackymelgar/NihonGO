-- ============================================================
-- Nihongo Hero — FULL consolidated schema (migrations 0001–0006)
-- Generated from supabase/migrations/*.sql — do not edit by hand.
--
-- Apply as ONE migration through the Supabase MCP server, e.g.:
--   apply_migration(name: "nihongo_full_schema", query: <contents of this file>)
-- or execute_sql(query: <contents of this file>).
--
-- Intended for a FRESH project (0001 uses bare CREATE TYPE/TABLE and will
-- error if the objects already exist). apply_migration records it by name,
-- so it will not be applied twice.
-- ============================================================


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- SOURCE: supabase/migrations/0001_init.sql
-- <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<

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


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- SOURCE: supabase/migrations/0002_complete_quest.sql
-- <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<

-- ============================================================
-- Nihongo Hero — complete_quest RPC (§9.1)
-- Atomic, server-validated quest completion. Called via supabase.rpc().
-- ============================================================

create or replace function complete_quest(p_quest_id uuid, p_score numeric default 1.0)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_quest quests%rowtype;
  v_area areas%rowtype;
  v_already_completed boolean := false;
  v_step_count int;
  v_xp_earned int := 0;
  v_leveled_up boolean := false;
  v_old_level int;
  v_new_level int;
  v_total_xp int;
  v_tz text;
  v_today date;
  v_last date;
  v_streak int;
  v_badge jsonb := null;
  v_unlocked_quests jsonb := '[]'::jsonb;
  v_unlocked_areas jsonb := '[]'::jsonb;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_quest from quests
    where id = p_quest_id and status = 'published' and deleted_at is null;
  if not found then
    raise exception 'Quest not found or not published';
  end if;

  select * into v_area from areas where id = v_quest.area_id;
  if v_area.status <> 'published' then
    raise exception 'Area not published';
  end if;

  -- Prerequisite gate: the required quest must already be completed.
  if v_quest.required_quest_id is not null then
    if not exists (
      select 1 from user_quest_progress
      where user_id = v_uid and quest_id = v_quest.required_quest_id and status = 'completed'
    ) then
      raise exception 'Prerequisite quest not completed';
    end if;
  end if;

  select count(*) into v_step_count from lesson_steps
    where quest_id = p_quest_id and deleted_at is null;

  -- Has the user completed this quest before? (Replays grant no XP.)
  select (status = 'completed') into v_already_completed
    from user_quest_progress where user_id = v_uid and quest_id = p_quest_id;
  v_already_completed := coalesce(v_already_completed, false);

  insert into user_quest_progress (user_id, quest_id, status, current_step_index, score, attempts, completed_at)
  values (v_uid, p_quest_id, 'completed', v_step_count, p_score, 1, now())
  on conflict (user_id, quest_id) do update
    set status = 'completed',
        current_step_index = excluded.current_step_index,
        score = excluded.score,
        attempts = user_quest_progress.attempts + 1,
        completed_at = now();

  -- Seed review items for everything this quest teaches (don't reset existing).
  insert into user_item_mastery (user_id, item_id, state, srs_stage, next_review_at, unlocked_at)
  select v_uid, qi.item_id, 'learning', 1, now() + interval '4 hours', now()
  from quest_items qi where qi.quest_id = p_quest_id
  on conflict (user_id, item_id) do nothing;

  if not v_already_completed then
    v_xp_earned := v_quest.xp_reward;

    -- Award XP + level (level = floor(sqrt(total_xp/100)) + 1).
    select level into v_old_level from user_stats where user_id = v_uid;
    update user_stats
      set total_xp = total_xp + v_xp_earned,
          lessons_completed = lessons_completed + 1,
          level = floor(sqrt((total_xp + v_xp_earned) / 100.0)) + 1
      where user_id = v_uid
      returning level, total_xp into v_new_level, v_total_xp;
    v_leveled_up := coalesce(v_new_level > v_old_level, false);

    -- Streak (user-local day boundary).
    select timezone into v_tz from profiles where id = v_uid;
    v_today := (now() at time zone coalesce(v_tz, 'UTC'))::date;
    select last_active_date, current_streak into v_last, v_streak
      from user_stats where user_id = v_uid;
    if v_last is null or v_last < v_today then
      if v_last = v_today - 1 then
        v_streak := coalesce(v_streak, 0) + 1;
      else
        v_streak := 1;
      end if;
      update user_stats
        set current_streak = v_streak,
            longest_streak = greatest(longest_streak, v_streak),
            last_active_date = v_today
        where user_id = v_uid;
    end if;

    -- Daily quest tick.
    insert into daily_quests (user_id, quest_date, lessons_done)
    values (v_uid, v_today, 1)
    on conflict (user_id, quest_date) do update
      set lessons_done = daily_quests.lessons_done + 1;

    -- Badge grant.
    if v_quest.badge_id is not null then
      insert into user_badges (user_id, badge_id) values (v_uid, v_quest.badge_id)
      on conflict do nothing;
      if found then
        select jsonb_build_object('id', id, 'slug', slug, 'title', title, 'icon_emoji', icon_emoji)
          into v_badge from badges where id = v_quest.badge_id;
      end if;
    end if;

    insert into analytics_events (user_id, event_name, payload)
    values (v_uid, 'quest_completed', jsonb_build_object('quest_id', p_quest_id, 'score', p_score));
  else
    select total_xp, level into v_total_xp, v_new_level from user_stats where user_id = v_uid;
  end if;

  -- Newly unlocked quests (those gated on this one).
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'slug', slug, 'title', title)), '[]'::jsonb)
    into v_unlocked_quests
  from quests
  where required_quest_id = p_quest_id and status = 'published' and deleted_at is null;

  -- Boss pass unlocks the next area in the course.
  if v_quest.quest_type = 'boss' and p_score >= v_quest.pass_threshold then
    select coalesce(jsonb_agg(jsonb_build_object('id', a.id, 'slug', a.slug, 'title', a.title)), '[]'::jsonb)
      into v_unlocked_areas
    from areas a
    where a.course_id = v_area.course_id
      and a.status = 'published' and a.deleted_at is null
      and a.sort_order = (
        select min(sort_order) from areas
        where course_id = v_area.course_id and sort_order > v_area.sort_order
          and status = 'published' and deleted_at is null
      );
  end if;

  return jsonb_build_object(
    'xp_earned', v_xp_earned,
    'leveled_up', v_leveled_up,
    'new_level', v_new_level,
    'total_xp', v_total_xp,
    'badge', v_badge,
    'unlocked_quests', v_unlocked_quests,
    'unlocked_areas', v_unlocked_areas,
    'already_completed', v_already_completed
  );
end $$;

grant execute on function complete_quest(uuid, numeric) to authenticated;


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- SOURCE: supabase/migrations/0003_submit_review.sql
-- <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<

-- ============================================================
-- Nihongo Hero — submit_review_result RPC (§9.2)
-- Applies the §7 SRS + four-skill math server-side (mirrors lib/srs.ts +
-- lib/mastery.ts), logs the answer, ticks the daily quest, awards review XP.
-- ============================================================

create or replace function submit_review_result(
  p_item_id uuid,
  p_is_correct boolean,
  p_skills skill_type[],
  p_activity_type activity_type,
  p_activity_id uuid default null,
  p_response_ms int default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  m user_item_mastery%rowtype;
  v_r numeric; v_w numeric; v_l numeric; v_ls numeric;
  v_stage int;
  v_cc int; v_cw int;
  v_avg numeric;
  v_state mastery_state;
  v_next timestamptz;
  v_xp int;
  v_tz text; v_today date; v_last date; v_streak int;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;

  select * into m from user_item_mastery where user_id = v_uid and item_id = p_item_id;
  if not found then raise exception 'Item not in review queue'; end if;

  -- Skill EMA: correct → s + (100-s)*0.30 ; wrong → s*0.65 (only trained skills).
  v_r := m.reading_score;  v_w := m.writing_score;  v_l := m.listening_score;  v_ls := m.speaking_score;
  if 'reading'   = any(p_skills) then v_r  := case when p_is_correct then v_r  + (100-v_r )*0.30 else v_r *0.65 end; end if;
  if 'writing'   = any(p_skills) then v_w  := case when p_is_correct then v_w  + (100-v_w )*0.30 else v_w *0.65 end; end if;
  if 'listening' = any(p_skills) then v_l  := case when p_is_correct then v_l  + (100-v_l )*0.30 else v_l *0.65 end; end if;
  if 'speaking'  = any(p_skills) then v_ls := case when p_is_correct then v_ls + (100-v_ls)*0.30 else v_ls*0.65 end; end if;
  v_r := round(greatest(0, least(100, v_r)), 2);
  v_w := round(greatest(0, least(100, v_w)), 2);
  v_l := round(greatest(0, least(100, v_l)), 2);
  v_ls := round(greatest(0, least(100, v_ls)), 2);

  -- Stage + scheduling.
  if p_is_correct then
    v_stage := least(6, m.srs_stage + 1);
    v_next := now() + (case v_stage
      when 1 then interval '4 hours'
      when 2 then interval '1 day'
      when 3 then interval '3 days'
      when 4 then interval '7 days'
      when 5 then interval '14 days'
      when 6 then interval '30 days'
      else interval '4 hours' end);
    v_cc := m.consecutive_correct + 1;
    v_cw := 0;
  else
    v_stage := greatest(1, m.srs_stage - 2);
    v_next := now() + interval '4 hours';
    v_cc := 0;
    v_cw := m.consecutive_wrong + 1;
  end if;

  v_avg := (v_r + v_w + v_l + v_ls) / 4.0;
  v_state := case
    when v_cw >= 2 then 'weak'
    when v_stage >= 6 and v_avg >= 80 then 'mastered'
    when v_stage >= 5 then 'strong'
    when v_stage >= 3 then 'familiar'
    when v_stage >= 1 then 'learning'
    else 'new' end;

  update user_item_mastery set
    reading_score = v_r, writing_score = v_w, listening_score = v_l, speaking_score = v_ls,
    srs_stage = v_stage,
    consecutive_correct = v_cc, consecutive_wrong = v_cw,
    total_correct = total_correct + (case when p_is_correct then 1 else 0 end),
    total_wrong   = total_wrong   + (case when p_is_correct then 0 else 1 end),
    next_review_at = v_next,
    last_reviewed_at = now(),
    state = v_state
  where user_id = v_uid and item_id = p_item_id;

  -- Log the answer.
  insert into answer_logs (user_id, activity_id, item_id, context, activity_type, skills, is_correct, response_ms)
  values (v_uid, p_activity_id, p_item_id, 'review', p_activity_type, p_skills, p_is_correct, p_response_ms);

  -- Review XP (2 per correct) + stats + streak.
  v_xp := case when p_is_correct then 2 else 0 end;
  select timezone into v_tz from profiles where id = v_uid;
  v_today := (now() at time zone coalesce(v_tz, 'UTC'))::date;
  select last_active_date, current_streak into v_last, v_streak from user_stats where user_id = v_uid;

  update user_stats set
    total_xp = total_xp + v_xp,
    reviews_completed = reviews_completed + 1,
    level = floor(sqrt((total_xp + v_xp) / 100.0)) + 1
  where user_id = v_uid;

  if v_last is null or v_last < v_today then
    if v_last = v_today - 1 then v_streak := coalesce(v_streak, 0) + 1; else v_streak := 1; end if;
    update user_stats set current_streak = v_streak,
                          longest_streak = greatest(longest_streak, v_streak),
                          last_active_date = v_today
      where user_id = v_uid;
  end if;

  -- Daily quest review tick.
  insert into daily_quests (user_id, quest_date, reviews_done)
  values (v_uid, v_today, 1)
  on conflict (user_id, quest_date) do update
    set reviews_done = daily_quests.reviews_done + 1;

  return jsonb_build_object(
    'item_id', p_item_id,
    'state', v_state,
    'srs_stage', v_stage,
    'reading_score', v_r, 'writing_score', v_w, 'listening_score', v_l, 'speaking_score', v_ls,
    'next_review_at', v_next,
    'xp_earned', v_xp
  );
end $$;

grant execute on function submit_review_result(uuid, boolean, skill_type[], activity_type, uuid, int) to authenticated;


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- SOURCE: supabase/migrations/0004_get_dashboard.sql
-- <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<

-- ============================================================
-- Nihongo Hero — get_dashboard RPC (§9.4)
-- One round-trip for the hottest page: stats, daily quest (ensured + completed),
-- due counts by type, weakest skill, and 7-day activity.
-- ============================================================

create or replace function get_dashboard()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_tz text;
  v_today date;
  st user_stats%rowtype;
  dq daily_quests%rowtype;
  v_due_total int;
  v_due_by_type jsonb;
  v_weakest text;
  v_weakest_score numeric;
  v_ravg numeric; v_wavg numeric; v_lavg numeric; v_savg numeric;
  v_daily_completed_now boolean := false;
  v_weekly jsonb;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;

  select timezone into v_tz from profiles where id = v_uid;
  v_tz := coalesce(v_tz, 'UTC');
  v_today := (now() at time zone v_tz)::date;

  select * into st from user_stats where user_id = v_uid;

  -- Ensure today's daily quest exists (targets: 1 lesson, 10 reviews).
  insert into daily_quests (user_id, quest_date, lessons_target, reviews_target, xp_reward)
  values (v_uid, v_today, 1, 10, 30)
  on conflict (user_id, quest_date) do nothing;
  select * into dq from daily_quests where user_id = v_uid and quest_date = v_today;

  -- Complete the daily quest (award XP once) when both targets are met.
  if dq.completed_at is null
     and dq.lessons_done >= dq.lessons_target
     and dq.reviews_done >= dq.reviews_target then
    update daily_quests set completed_at = now()
      where user_id = v_uid and quest_date = v_today;
    update user_stats
      set total_xp = total_xp + dq.xp_reward,
          level = floor(sqrt((total_xp + dq.xp_reward) / 100.0)) + 1
      where user_id = v_uid;
    v_daily_completed_now := true;
    select * into st from user_stats where user_id = v_uid;
    select * into dq from daily_quests where user_id = v_uid and quest_date = v_today;
  end if;

  -- Due reviews.
  select count(*) into v_due_total
  from user_item_mastery
  where user_id = v_uid and next_review_at <= now();

  select coalesce(jsonb_object_agg(item_type, cnt), '{}'::jsonb) into v_due_by_type
  from (
    select li.item_type, count(*) cnt
    from user_item_mastery m
    join learning_items li on li.id = m.item_id
    where m.user_id = v_uid and m.next_review_at <= now()
    group by li.item_type
  ) t;

  -- Weakest skill (average across all mastery rows).
  select avg(reading_score), avg(writing_score), avg(listening_score), avg(speaking_score)
    into v_ravg, v_wavg, v_lavg, v_savg
  from user_item_mastery where user_id = v_uid;

  if v_ravg is not null then
    v_weakest := 'reading'; v_weakest_score := v_ravg;
    if v_wavg < v_weakest_score then v_weakest := 'writing';   v_weakest_score := v_wavg; end if;
    if v_lavg < v_weakest_score then v_weakest := 'listening'; v_weakest_score := v_lavg; end if;
    if v_savg < v_weakest_score then v_weakest := 'speaking';  v_weakest_score := v_savg; end if;
  end if;

  -- 7-day activity (answers per local day).
  select coalesce(jsonb_agg(jsonb_build_object('date', d::date, 'count', coalesce(c.cnt, 0)) order by d), '[]'::jsonb)
    into v_weekly
  from generate_series((v_today - 6)::timestamp, v_today::timestamp, interval '1 day') d
  left join (
    select (answered_at at time zone v_tz)::date dd, count(*) cnt
    from answer_logs
    where user_id = v_uid and answered_at >= now() - interval '8 days'
    group by dd
  ) c on c.dd = d::date;

  return jsonb_build_object(
    'stats', jsonb_build_object(
      'total_xp', st.total_xp, 'level', st.level,
      'current_streak', st.current_streak, 'longest_streak', st.longest_streak,
      'lessons_completed', st.lessons_completed, 'reviews_completed', st.reviews_completed
    ),
    'daily', jsonb_build_object(
      'lessons_target', dq.lessons_target, 'reviews_target', dq.reviews_target,
      'lessons_done', dq.lessons_done, 'reviews_done', dq.reviews_done,
      'completed', dq.completed_at is not null, 'xp_reward', dq.xp_reward,
      'just_completed', v_daily_completed_now
    ),
    'due_total', v_due_total,
    'due_by_type', v_due_by_type,
    'weakest_skill', v_weakest,
    'weakest_score', v_weakest_score,
    'weekly', v_weekly
  );
end $$;

grant execute on function get_dashboard() to authenticated;


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- SOURCE: supabase/migrations/0005_submit_boss.sql
-- <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<

-- ============================================================
-- Nihongo Hero — submit_boss_attempt RPC (§9.3)
-- Grades a boss attempt server-side against the quest's activities. On pass it
-- delegates to complete_quest for XP/badge/unlock. Returns per-item results so
-- the fail screen can offer a targeted review of missed items.
--
-- p_answers is a jsonb object keyed by activity_id:
--   { "<activity_id>": { "answer": "<label|text>", "client_correct": bool } }
-- Choice + typed activities are graded authoritatively; other types fall back to
-- the client's self-report (sentence_builder / match_pair / flashcard).
-- ============================================================

create or replace function submit_boss_attempt(p_quest_id uuid, p_answers jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_quest quests%rowtype;
  act record;
  v_ans jsonb;
  v_answer_text text;
  v_correct boolean;
  v_norm text;
  v_total int := 0;
  v_correct_count int := 0;
  v_score numeric;
  v_passed boolean;
  v_missed jsonb := '[]'::jsonb;
  v_missed_ids uuid[] := '{}';
  v_completion jsonb := null;
  v_attempts int;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;

  select * into v_quest from quests
    where id = p_quest_id and status = 'published' and deleted_at is null and quest_type = 'boss';
  if not found then raise exception 'Boss quest not found'; end if;

  for act in
    select * from activities
    where quest_id = p_quest_id and status = 'published' and deleted_at is null
    order by sort_order
  loop
    v_total := v_total + 1;
    v_ans := p_answers -> act.id::text;
    v_answer_text := v_ans ->> 'answer';

    if exists (select 1 from activity_choices where activity_id = act.id) then
      v_correct := exists (
        select 1 from activity_choices
        where activity_id = act.id and is_correct and label = v_answer_text
      );
    elsif act.correct_answer is not null then
      v_norm := lower(regexp_replace(coalesce(v_answer_text, ''), '\s', '', 'g'));
      v_correct := v_norm = lower(regexp_replace(act.correct_answer, '\s', '', 'g'))
        or v_norm = any (
          select lower(regexp_replace(a, '\s', '', 'g')) from unnest(act.accepted_answers) a
        );
    else
      v_correct := coalesce((v_ans ->> 'client_correct')::boolean, false);
    end if;

    if v_correct then
      v_correct_count := v_correct_count + 1;
    elsif act.item_id is not null then
      v_missed_ids := v_missed_ids || act.item_id;
      v_missed := v_missed || jsonb_build_object(
        'item_id', act.item_id,
        'activity_id', act.id,
        'prompt', act.prompt_md,
        'japanese', act.japanese_text,
        'skills', to_jsonb(act.skills)
      );
    end if;

    insert into answer_logs (user_id, activity_id, item_id, quest_id, context, activity_type, skills, is_correct, user_answer)
    values (v_uid, act.id, act.item_id, p_quest_id, 'boss', act.activity_type, act.skills, v_correct, v_answer_text);
  end loop;

  v_score := case when v_total > 0 then v_correct_count::numeric / v_total else 0 end;
  v_passed := v_total > 0 and v_score >= v_quest.pass_threshold;

  if v_passed then
    -- Full completion (seeds items, awards XP/badge, unlocks next area).
    v_completion := complete_quest(p_quest_id, v_score);
  else
    insert into user_quest_progress (user_id, quest_id, status, score, attempts)
    values (v_uid, p_quest_id, 'failed', v_score, 1)
    on conflict (user_id, quest_id) do update
      set status = 'failed', score = v_score, attempts = user_quest_progress.attempts + 1;
    insert into analytics_events (user_id, event_name, payload)
    values (v_uid, 'boss_failed', jsonb_build_object('quest_id', p_quest_id, 'score', v_score));
  end if;

  select attempts into v_attempts from user_quest_progress where user_id = v_uid and quest_id = p_quest_id;

  return jsonb_build_object(
    'score', v_score,
    'passed', v_passed,
    'total', v_total,
    'correct', v_correct_count,
    'attempts', coalesce(v_attempts, 1),
    'missed', v_missed,
    'missed_item_ids', to_jsonb(v_missed_ids),
    'completion', v_completion
  );
end $$;

grant execute on function submit_boss_attempt(uuid, jsonb) to authenticated;


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- SOURCE: supabase/migrations/0006_speaking_activity.sql
-- <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<

-- migrate:no-transaction
-- ============================================================
-- Nihongo Hero — add 'speaking' to the activity_type enum (v2 speech scoring).
-- ALTER TYPE ... ADD VALUE is safest outside a transaction block, so the
-- migration runner applies this file unwrapped.
-- ============================================================

alter type activity_type add value if not exists 'speaking';

