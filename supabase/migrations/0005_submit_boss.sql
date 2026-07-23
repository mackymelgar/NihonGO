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
