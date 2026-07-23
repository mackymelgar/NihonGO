import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type {
  ActivityChoiceRow,
  ActivityRow,
  LessonStepRow,
  QuestRow,
  UserQuestProgressRow,
} from '@/lib/database.types';
import { useAuth } from '../useAuth';

export type PlayerActivity = ActivityRow & { choices: ActivityChoiceRow[] };
export type PlayerStep = LessonStepRow & { activity: PlayerActivity | null };

export type QuestPlayerData = {
  quest: QuestRow;
  steps: PlayerStep[];
  progress: UserQuestProgressRow | null;
};

/** Loads a quest and its ordered steps for the lesson player. In preview mode
 * (admin), draft content is included and progress is ignored. */
export function useQuestPlayer(slug: string | undefined, preview = false) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['quest-player', slug, preview],
    enabled: Boolean(slug),
    queryFn: async (): Promise<QuestPlayerData> => {
      let questQuery = supabase.from('quests').select('*').eq('slug', slug!).is('deleted_at', null);
      if (!preview) questQuery = questQuery.eq('status', 'published');
      const quest = await questQuery.single();
      if (quest.error) throw quest.error;

      const [steps, activities, progress] = await Promise.all([
        supabase
          .from('lesson_steps')
          .select('*')
          .eq('quest_id', quest.data.id)
          .is('deleted_at', null)
          .order('sort_order'),
        supabase
          .from('activities')
          .select('*, choices:activity_choices(*)')
          .eq('quest_id', quest.data.id)
          .is('deleted_at', null),
        preview || !user
          ? Promise.resolve({ data: null, error: null })
          : supabase
              .from('user_quest_progress')
              .select('*')
              .eq('user_id', user.id)
              .eq('quest_id', quest.data.id)
              .maybeSingle(),
      ]);
      if (steps.error) throw steps.error;
      if (activities.error) throw activities.error;

      const activitiesById = new Map<string, PlayerActivity>();
      for (const a of activities.data as unknown as PlayerActivity[]) {
        a.choices = [...(a.choices ?? [])].sort((x, y) => x.sort_order - y.sort_order);
        activitiesById.set(a.id, a);
      }

      const playerSteps: PlayerStep[] = steps.data.map((s) => ({
        ...s,
        activity: s.activity_id ? (activitiesById.get(s.activity_id) ?? null) : null,
      }));

      return {
        quest: quest.data,
        steps: playerSteps,
        progress: (progress.data as UserQuestProgressRow | null) ?? null,
      };
    },
  });
}
