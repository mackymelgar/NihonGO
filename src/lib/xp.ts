/** XP / level curve (§ gamification). Level = floor(sqrt(total_xp / 100)) + 1.
 * The DB denormalizes `level`; these helpers drive client progress display. */

export function levelForXp(totalXp: number): number {
  return Math.floor(Math.sqrt(Math.max(0, totalXp) / 100)) + 1;
}

/** Total XP required to reach a given level. */
export function xpForLevel(level: number): number {
  const l = Math.max(1, level);
  return (l - 1) * (l - 1) * 100;
}

/** Progress within the current level: xp into level, xp needed for next, fraction. */
export function levelProgress(totalXp: number): {
  level: number;
  intoLevel: number;
  span: number;
  fraction: number;
} {
  const level = levelForXp(totalXp);
  const base = xpForLevel(level);
  const next = xpForLevel(level + 1);
  const span = next - base;
  const intoLevel = totalXp - base;
  return { level, intoLevel, span, fraction: span === 0 ? 0 : intoLevel / span };
}
