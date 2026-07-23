import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { AreaRow, CourseRow, QuestRow, UserQuestProgressRow } from '@/lib/database.types';
import { computeUnlocks, areaProgress } from '@/lib/unlock';
import { useAuth } from '../useAuth';

export type RoadmapArea = AreaRow & {
  quests: QuestRow[];
  unlocked: boolean;
  progress: { done: number; total: number; fraction: number };
};

export type Roadmap = {
  course: CourseRow | null;
  areas: RoadmapArea[];
  completedQuestIds: Set<string>;
  questUnlocked: Map<string, boolean>;
  progressByQuest: Map<string, UserQuestProgressRow>;
};

export function useRoadmap() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['roadmap', user?.id],
    enabled: Boolean(user?.id),
    queryFn: async (): Promise<Roadmap> => {
      const [courses, areas, quests, progress] = await Promise.all([
        supabase.from('courses').select('*').eq('status', 'published').is('deleted_at', null).order('sort_order'),
        supabase.from('areas').select('*').eq('status', 'published').is('deleted_at', null).order('sort_order'),
        supabase.from('quests').select('*').eq('status', 'published').is('deleted_at', null).order('sort_order'),
        supabase.from('user_quest_progress').select('*').eq('user_id', user!.id),
      ]);
      if (courses.error) throw courses.error;
      if (areas.error) throw areas.error;
      if (quests.error) throw quests.error;
      if (progress.error) throw progress.error;

      const progressByQuest = new Map(progress.data.map((p) => [p.quest_id, p]));
      const completedQuestIds = new Set(
        progress.data.filter((p) => p.status === 'completed').map((p) => p.quest_id),
      );

      const { areaUnlocked, questUnlocked } = computeUnlocks({
        areas: areas.data,
        quests: quests.data,
        completedQuestIds,
      });

      const roadmapAreas: RoadmapArea[] = areas.data.map((area) => ({
        ...area,
        quests: quests.data.filter((q) => q.area_id === area.id),
        unlocked: areaUnlocked.get(area.id) ?? false,
        progress: areaProgress(area.id, quests.data, completedQuestIds),
      }));

      return {
        course: courses.data[0] ?? null,
        areas: roadmapAreas,
        completedQuestIds,
        questUnlocked,
        progressByQuest,
      };
    },
  });
}
