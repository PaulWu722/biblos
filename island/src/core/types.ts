import type { EggTier } from '../../config/rules';
import type { SceneId } from '../../config/scenes';

export interface Entity { id: string; createdAt: string; updatedAt: string; }
export interface ReadRecord extends Entity { articleId: string; correct: number; }
export interface PendingRead { articleId: string; correct: number; }
export interface Egg extends Entity { tier: EggTier; sceneId: SceneId; hatched: boolean; animalId?: string; }
export interface Animal extends Entity { speciesId: string; originSceneId: SceneId; xp: number; level: 1 | 2 | 3; /** Player-given name, shown over its head. */ name?: string; }
export interface CollectionEntry extends Entity { speciesId: string; maxLevel: 1 | 2 | 3; count: number; }
export interface Settings { reducedMotion?: boolean; }

export interface GameState {
  version: number;
  userId: string;
  reads: ReadRecord[];
  pendingBatch: PendingRead[];
  eggs: Egg[];
  animals: Animal[];
  /** Experience earned by reading, waiting to be spent on levelling animals up (in 圖鑑). */
  xp: number;
  currentSceneId: SceneId;
  unlockedSceneIds: SceneId[];
  collection: Record<string, CollectionEntry>;
  goldenScenes: SceneId[];
  lastResetAt: string;
  settings: Settings;
}

export type GameAction =
  | { type: 'SUBMIT_ARTICLE'; articleId: string; correct: number; scrolledToBottom: boolean }
  | { type: 'HATCH_EGG'; eggId: string }
  | { type: 'LEVEL_UP_ANIMAL'; animalId: string }
  | { type: 'RENAME_ANIMAL'; animalId: string; name: string };

export type GameEvent =
  | { type: 'EGG_EARNED'; egg: Egg }
  | { type: 'EGG_HATCHED'; egg: Egg; animal: Animal }
  | { type: 'LEVEL_UP'; animalId: string; level: 2 | 3 }
  | { type: 'SCENE_UNLOCKED'; from: SceneId; to: SceneId }
  | { type: 'GOLDEN_UNLOCKED'; sceneId: SceneId }
  | { type: 'REJECTED'; reason: 'DUPLICATE_ARTICLE' | 'NOT_SCROLLED' | 'BAD_INPUT' | 'NO_EGG' | 'MAX_LEVEL' | 'NOT_ENOUGH_XP' };

export interface EngineCtx { now: Date; rng: () => number; newId: () => string; }
export interface DispatchResult { state: GameState; events: GameEvent[]; }
