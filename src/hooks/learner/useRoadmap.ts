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

export type RoadmapCourse = CourseRow & {
  areas: RoadmapArea[];
  /** The course is playable (its prerequisite course, if any, is complete). */
  unlocked: boolean;
  /** Every boss in the course has been passed. */
  complete: boolean;
  progress: { done: number; total: number; fraction: number };
};

export type Roadmap = {
  courses: RoadmapCourse[];
  completedQuestIds: Set<string>;
  /** Effective unlock per quest (course gating already applied). */
  questUnlocked: Map<string, boolean>;
  progressByQuest: Map<string, UserQuestProgressRow>;
};

function courseProgress(quests: QuestRow[], completed: Set<string>) {
  const gating = quests.filter((q) => q.quest_type !== 'side');
  const total = gating.length;
  const done = gating.filter((q) => completed.has(q.id)).length;
  return { done, total, fraction: total === 0 ? 0 : done / total };
}

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

      const questUnlocked = new Map<string, boolean>();
      const completeByCourse = new Map<string, boolean>();
      const roadmapCourses: RoadmapCourse[] = [];

      // Courses are processed in sort order so a prerequisite's completion is
      // known before the course that depends on it.
      for (const course of courses.data) {
        const courseAreas = areas.data.filter((a) => a.course_id === course.id);
        const areaIds = new Set(courseAreas.map((a) => a.id));
        const courseQuests = quests.data.filter((q) => areaIds.has(q.area_id));

        const { areaUnlocked, questUnlocked: within } = computeUnlocks({
          areas: courseAreas,
          quests: courseQuests,
          completedQuestIds,
        });

        const bosses = courseQuests.filter((q) => q.quest_type === 'boss');
        const complete = bosses.length > 0 && bosses.every((b) => completedQuestIds.has(b.id));
        completeByCourse.set(course.id, complete);

        const unlocked = !course.required_course_id || (completeByCourse.get(course.required_course_id) ?? false);

        // Apply course gating to every quest's effective unlock.
        for (const q of courseQuests) {
          questUnlocked.set(q.id, unlocked && (within.get(q.id) ?? false));
        }

        roadmapCourses.push({
          ...course,
          unlocked,
          complete,
          progress: courseProgress(courseQuests, completedQuestIds),
          areas: courseAreas.map((area) => ({
            ...area,
            quests: courseQuests.filter((q) => q.area_id === area.id),
            unlocked: unlocked && (areaUnlocked.get(area.id) ?? false),
            progress: areaProgress(area.id, courseQuests, completedQuestIds),
          })),
        });
      }

      return { courses: roadmapCourses, completedQuestIds, questUnlocked, progressByQuest };
    },
  });
}
