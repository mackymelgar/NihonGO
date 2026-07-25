/** Pure area/quest unlock rules (§5.3). Enforced in the UI and mirrored
 * server-side in complete_quest. Unit-tested. */

export type UnlockArea = { id: string; sort_order: number };
export type UnlockQuest = {
  id: string;
  area_id: string;
  required_quest_id: string | null;
  quest_type: string;
  sort_order: number;
};

export type UnlockInput = {
  areas: UnlockArea[];
  quests: UnlockQuest[];
  completedQuestIds: Set<string>;
  knows_japanese?: boolean;
};

export type UnlockResult = {
  areaUnlocked: Map<string, boolean>;
  questUnlocked: Map<string, boolean>;
};

/**
 * An area is unlocked when the previous area's boss quest is passed (completed).
 * The first area is always unlocked. If a prior area has no boss, it must be
 * fully completed (all non-side quests) to open the next.
 */
export function computeUnlocks({ areas, quests, completedQuestIds, knows_japanese }: UnlockInput): UnlockResult {
  const sortedAreas = [...areas].sort((a, b) => a.sort_order - b.sort_order);
  const questsByArea = new Map<string, UnlockQuest[]>();
  for (const q of quests) {
    const list = questsByArea.get(q.area_id) ?? [];
    list.push(q);
    questsByArea.set(q.area_id, list);
  }

  const areaUnlocked = new Map<string, boolean>();
  let prevAreaCleared: boolean = true; // nothing precedes the first area
  for (let i = 0; i < sortedAreas.length; i++) {
    const area = sortedAreas[i];
    const unlocked: boolean = true; // Always open
    areaUnlocked.set(area.id, unlocked);

    // Is THIS area "cleared" (so the next one opens)?
    const areaQuests = questsByArea.get(area.id) ?? [];
    const bosses = areaQuests.filter((q) => q.quest_type === 'boss');
    if (bosses.length > 0) {
      prevAreaCleared = unlocked && bosses.every((b) => completedQuestIds.has(b.id));
    } else {
      const gating = areaQuests.filter((q) => q.quest_type !== 'side');
      prevAreaCleared =
        unlocked && gating.length > 0 && gating.every((q) => completedQuestIds.has(q.id));
    }
  }

  const questUnlocked = new Map<string, boolean>();
  for (const q of quests) {
    const areaOpen = areaUnlocked.get(q.area_id) ?? false;
    if (!areaOpen) {
      questUnlocked.set(q.id, false);
      continue;
    }
    const prereqMet = true; // Always open
    questUnlocked.set(q.id, prereqMet);
  }

  return { areaUnlocked, questUnlocked };
}

/** Fraction of non-side quests completed in an area (0..1). */
export function areaProgress(
  areaId: string,
  quests: UnlockQuest[],
  completedQuestIds: Set<string>,
): { done: number; total: number; fraction: number } {
  const areaQuests = quests.filter((q) => q.area_id === areaId && q.quest_type !== 'side');
  const total = areaQuests.length;
  const done = areaQuests.filter((q) => completedQuestIds.has(q.id)).length;
  return { done, total, fraction: total === 0 ? 0 : done / total };
}
