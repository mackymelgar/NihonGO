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
