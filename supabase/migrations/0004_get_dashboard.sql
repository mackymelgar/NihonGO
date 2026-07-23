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
