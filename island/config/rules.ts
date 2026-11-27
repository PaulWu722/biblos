// Single source of truth for every game number (see designstructure.md §1).
export const RULES = {
  articlesPerEgg: 3,
  /** Total articles read to move on: island n+1 opens at n × this. Islands hold any number of animals. */
  readsPerScene: 60,
  questionsPerArticle: 2,
  xpPerArticle: 10,
  xpPerCorrect: 10,
  /** Daily reset at 05:00 Asia/Taipei (UTC+8). */
  resetHourTaipei: 5,
  taipeiOffsetHours: 8,
  /** Weight of an earlier-scene species showing up in normal/rare eggs. */
  oldSpeciesWeight: 0.2,
  levelXp: { 1: 0, 2: 100, 3: 250 } as Record<1 | 2 | 3, number>,
  /** Egg tier by correct answers out of the 6 in a batch. */
  tierBounds: { rareMin: 3, preciousMin: 5, legendaryMin: 6 },
  startXp: { normal: 0, rare: 30, precious: 60, legendary: 100 },
  storageKey: 'xinxi-island:v1',
  stateVersion: 3,
} as const;

export type EggTier = 'normal' | 'rare' | 'precious' | 'legendary';
export const TIER_LABEL: Record<EggTier, string> = {
  normal: '普通蛋', rare: '稀有蛋', precious: '珍貴蛋', legendary: '傳說蛋',
};
