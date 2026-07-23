import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type {
  ActivityChoiceRow,
  ItemType,
  LearningItemRow,
  SkillType,
  SubmitReviewResult,
  UserItemMasteryRow,
} from '@/lib/database.types';
import type { PlayerActivity } from './useQuestPlayer';
import { weakestSkill } from '@/lib/mastery';
import { generateReviewActivity } from '@/lib/reviewActivity';
import { isDue, isForgotten } from '@/lib/srs';
import { useAuth } from '../useAuth';

export type ReviewCard = {
  mastery: UserItemMasteryRow;
  item: LearningItemRow;
  activity: PlayerActivity;
  skill: SkillType;
};

export type ReviewSessionOptions = {
  itemType?: ItemType | 'all';
  limit?: number;
  itemIds?: string[]; // targeted review (e.g. boss-fail flow)
};

export function useReviewSession(opts: ReviewSessionOptions) {
  const { user } = useAuth();
  return useQuery({
    // Freeze the queue for the session; refetch only on manual invalidation.
    queryKey: ['review-session', user?.id, opts],
    enabled: Boolean(user?.id),
    staleTime: Infinity,
    gcTime: 0,
    queryFn: async (): Promise<ReviewCard[]> => {
      const now = new Date();
      let query = supabase
        .from('user_item_mastery')
        .select('*, item:learning_items(*)')
        .eq('user_id', user!.id);
      if (opts.itemIds && opts.itemIds.length > 0) {
        query = query.in('item_id', opts.itemIds);
      } else {
        query = query.lte('next_review_at', now.toISOString());
      }
      const { data, error } = await query;
      if (error) throw error;

      let rows = (data as unknown as (UserItemMasteryRow & { item: LearningItemRow })[]).filter(
        (r) => r.item && (opts.itemIds ? true : isDue(r.next_review_at, now)),
      );
      if (opts.itemType && opts.itemType !== 'all') {
        rows = rows.filter((r) => r.item.item_type === opts.itemType);
      }
      // Forgotten first, then most overdue.
      rows.sort((a, b) => {
        const fa = isForgotten(a.srs_stage, a.next_review_at, now) ? 1 : 0;
        const fb = isForgotten(b.srs_stage, b.next_review_at, now) ? 1 : 0;
        if (fa !== fb) return fb - fa;
        return new Date(a.next_review_at ?? 0).getTime() - new Date(b.next_review_at ?? 0).getTime();
      });
      if (opts.limit) rows = rows.slice(0, opts.limit);
      if (rows.length === 0) return [];

      const itemIds = rows.map((r) => r.item_id);
      const distractorTypes = [...new Set(rows.map((r) => r.item.item_type))];

      const [authored, poolRes] = await Promise.all([
        supabase
          .from('activities')
          .select('*, choices:activity_choices(*)')
          .in('item_id', itemIds)
          .eq('status', 'published')
          .is('deleted_at', null),
        supabase
          .from('learning_items')
          .select('*')
          .in('item_type', distractorTypes)
          .eq('status', 'published')
          .is('deleted_at', null)
          .limit(80),
      ]);
      if (authored.error) throw authored.error;

      const pool: LearningItemRow[] = (poolRes.data as LearningItemRow[] | null) ?? rows.map((r) => r.item);
      const authoredByItem = new Map<string, PlayerActivity[]>();
      for (const a of (authored.data ?? []) as unknown as PlayerActivity[]) {
        a.choices = [...((a as { choices?: ActivityChoiceRow[] }).choices ?? [])].sort(
          (x, y) => x.sort_order - y.sort_order,
        );
        const list = authoredByItem.get(a.item_id!) ?? [];
        list.push(a);
        authoredByItem.set(a.item_id!, list);
      }

      return rows.map((r) => {
        const skill = weakestSkill(r);
        const candidates = authoredByItem.get(r.item_id) ?? [];
        const authoredMatch =
          candidates.find((a) => a.skills.includes(skill)) ?? candidates[0] ?? null;
        const activity = authoredMatch ?? generateReviewActivity(r.item, skill, pool);
        return { mastery: r, item: r.item, activity, skill };
      });
    },
  });
}

export function useSubmitReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      card: ReviewCard;
      isCorrect: boolean;
      responseMs?: number;
    }): Promise<SubmitReviewResult> => {
      const { card, isCorrect, responseMs } = input;
      const isSynth = card.activity.id.startsWith('synth-');
      const { data, error } = await supabase.rpc('submit_review_result', {
        p_item_id: card.item.id,
        p_is_correct: isCorrect,
        p_skills: card.activity.skills,
        p_activity_type: card.activity.activity_type,
        p_activity_id: isSynth ? null : card.activity.id,
        p_response_ms: responseMs ?? null,
      });
      if (error) throw error;
      return data as SubmitReviewResult;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['review-lobby'] });
      qc.invalidateQueries({ queryKey: ['due-count'] });
      qc.invalidateQueries({ queryKey: ['stats'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['library'] });
    },
  });
}
