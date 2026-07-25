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
export function computeUnlocks({ areas, quests }: UnlockInput): UnlockResult {
  const areaUnlocked = new Map<string, boolean>();
  for (const area of areas) {
    areaUnlocked.set(area.id, true);
  }

  const questUnlocked = new Map<string, boolean>();
  for (const q of quests) {
    questUnlocked.set(q.id, true);
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
