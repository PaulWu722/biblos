import { RULES, type EggTier } from '../../config/rules';
import { SCENES, sceneById, type SceneId } from '../../config/scenes';
import { SPECIES, speciesOfScene } from '../../config/animals';
import { mulberry32 } from './rng';
import { gameDayStart } from './time';
import type {
  Animal, DispatchResult, EngineCtx, Egg, GameAction, GameEvent, GameState,
} from './types';

export function createInitialState(ctx: Pick<EngineCtx, 'now' | 'newId'>): GameState {
  return {
    version: RULES.stateVersion,
    userId: ctx.newId(),
    reads: [], pendingBatch: [], eggs: [], animals: [], xp: 0,
    currentSceneId: 'eden', unlockedSceneIds: ['eden'],
    collection: {}, goldenScenes: [],
    lastResetAt: ctx.now.toISOString(),
    settings: {},
  };
}

export function defaultCtx(seed?: number): EngineCtx {
  const rng = seed === undefined ? Math.random : mulberry32(seed);
  return { now: new Date(), rng, newId: () => crypto.randomUUID() };
}

export function levelForXp(xp: number): 1 | 2 | 3 {
  if (xp >= RULES.levelXp[3]) return 3;
  if (xp >= RULES.levelXp[2]) return 2;
  return 1;
}

export function tierForCorrect(correct: number): EggTier {
  const b = RULES.tierBounds;
  if (correct >= b.legendaryMin) return 'legendary';
  if (correct >= b.preciousMin) return 'precious';
  if (correct >= b.rareMin) return 'rare';
  return 'normal';
}

export const todayReadCount = (s: GameState, now: Date): number => {
  const start = gameDayStart(now);
  return s.reads.filter((r) => new Date(r.createdAt).getTime() >= start).length;
};
export const sceneFull = (s: GameState): boolean =>
  s.animals.length >= sceneById(s.currentSceneId).capacity;

/** Pick species for a hatched egg. Legendary = current scene's signature; others 80% new / 20% old. */
export function pickSpecies(tier: EggTier, scene: SceneId, rng: () => number): string {
  const cur = speciesOfScene(scene);
  if (tier === 'legendary') return sceneById(scene).signature;
  const olds = SPECIES.filter((s) => sceneById(s.scene).order < sceneById(scene).order);
  if ((tier === 'normal' || tier === 'rare') && olds.length && rng() < RULES.oldSpeciesWeight) {
    return olds[Math.floor(rng() * olds.length)]!.id;
  }
  return cur[Math.floor(rng() * cur.length)]!.id;
}

const stamp = (ctx: EngineCtx) => ctx.now.toISOString();

/** XP an animal still needs to reach its next level (0 at Lv3). */
export const upgradeCost = (a: Animal): number => (a.level === 3 ? 0 : Math.max(0, RULES.levelXp[(a.level + 1) as 2 | 3] - a.xp));

/** Golden variant of scene S: every species of S has been collected at Lv3. */
function updateCollectionAndGolden(s: GameState, ctx: EngineCtx, events: GameEvent[]): GameState {
  const collection = { ...s.collection };
  for (const a of s.animals) {
    const c = collection[a.speciesId];
    const count = s.animals.filter((x) => x.speciesId === a.speciesId).length;
    const maxLevel = Math.max(c?.maxLevel ?? 1, a.level) as 1 | 2 | 3;
    if (!c || c.maxLevel !== maxLevel || c.count !== count)
      collection[a.speciesId] = { id: c?.id ?? ctx.newId(), createdAt: c?.createdAt ?? stamp(ctx), updatedAt: stamp(ctx), speciesId: a.speciesId, maxLevel, count };
  }
  const goldenScenes = [...s.goldenScenes];
  for (const sc of SCENES) {
    if (goldenScenes.includes(sc.id)) continue;
    const sp = speciesOfScene(sc.id);
    if (sp.every((x) => collection[x.id]?.maxLevel === 3)) {
      goldenScenes.push(sc.id);
      events.push({ type: 'GOLDEN_UNLOCKED', sceneId: sc.id });
    }
  }
  return { ...s, collection, goldenScenes };
}

export function dispatch(state: GameState, action: GameAction, ctx: EngineCtx): DispatchResult {
  const events: GameEvent[] = [];
  const reject = (reason: Extract<GameEvent, { type: 'REJECTED' }>['reason']): DispatchResult =>
    ({ state, events: [{ type: 'REJECTED', reason }] });
  let s = state;

  if (action.type === 'SUBMIT_ARTICLE') {
    const { articleId, correct } = action;
    if (!articleId || !Number.isInteger(correct) || correct < 0 || correct > RULES.questionsPerArticle) return reject('BAD_INPUT');
    if (s.reads.some((r) => r.articleId === articleId)) return reject('DUPLICATE_ARTICLE');
    if (!action.scrolledToBottom) return reject('NOT_SCROLLED');

    const read = { id: ctx.newId(), createdAt: stamp(ctx), updatedAt: stamp(ctx), articleId, correct };
    const pendingBatch = [...s.pendingBatch, { articleId, correct }];
    let eggs = s.eggs;
    let batch = pendingBatch;
    if (pendingBatch.length >= RULES.articlesPerEgg) {
      const total = pendingBatch.reduce((n, r) => n + r.correct, 0);
      const egg: Egg = { id: ctx.newId(), createdAt: stamp(ctx), updatedAt: stamp(ctx), tier: tierForCorrect(total), sceneId: s.currentSceneId, hatched: false };
      eggs = [...eggs, egg];
      batch = [];
      events.push({ type: 'EGG_EARNED', egg });
    }
    s = { ...s, reads: [...s.reads, read], pendingBatch: batch, eggs, xp: s.xp + RULES.xpPerArticle + RULES.xpPerCorrect * correct };
    return { state: s, events };
  }

  if (action.type === 'HATCH_EGG') {
    const egg = s.eggs.find((e) => e.id === action.eggId && !e.hatched);
    if (!egg) return reject('NO_EGG');
    const speciesId = pickSpecies(egg.tier, s.currentSceneId, ctx.rng);
    const xp = RULES.startXp[egg.tier];
    const animal: Animal = {
      id: ctx.newId(), createdAt: stamp(ctx), updatedAt: stamp(ctx),
      speciesId, originSceneId: s.currentSceneId, xp, level: levelForXp(xp),
    };
    const hatched: Egg = { ...egg, hatched: true, animalId: animal.id, updatedAt: stamp(ctx) };
    s = { ...s, eggs: s.eggs.map((e) => (e.id === egg.id ? hatched : e)), animals: [...s.animals, animal] };
    events.push({ type: 'EGG_HATCHED', egg: hatched, animal });
    s = updateCollectionAndGolden(s, ctx, events);
    if (sceneFull(s)) {
      events.push({ type: 'SCENE_FULL', sceneId: s.currentSceneId });
      const next = SCENES.find((x) => x.order === sceneById(s.currentSceneId).order + 1);
      if (next) {
        events.push({ type: 'SCENE_UNLOCKED', from: s.currentSceneId, to: next.id });
        s = { ...s, currentSceneId: next.id, unlockedSceneIds: [...s.unlockedSceneIds, next.id] };
      }
    }
    return { state: s, events };
  }

  if (action.type === 'LEVEL_UP_ANIMAL') {
    const a = s.animals.find((x) => x.id === action.animalId);
    if (!a) return reject('BAD_INPUT');
    if (a.level === 3) return reject('MAX_LEVEL');
    const cost = upgradeCost(a);
    if (s.xp < cost) return reject('NOT_ENOUGH_XP');
    const level = (a.level + 1) as 2 | 3;
    const up = { ...a, level, xp: a.xp + cost, updatedAt: stamp(ctx) };
    events.push({ type: 'LEVEL_UP', animalId: a.id, level });
    s = { ...s, xp: s.xp - cost, animals: s.animals.map((x) => (x.id === a.id ? up : x)) };
    return { state: updateCollectionAndGolden(s, ctx, events), events };
  }
  return reject('BAD_INPUT');
}
