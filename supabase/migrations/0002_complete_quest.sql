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
