import { describe, expect, it } from 'vitest';
import { createInitialState, dispatch, levelForXp, pickSpecies, tierForCorrect, todayReadCount } from '../src/core/engine';
import { mulberry32 } from '../src/core/rng';
import { gameDayStart } from '../src/core/time';
import { migrate } from '../src/core/migrate';
import { RULES } from '../config/rules';
import type { EngineCtx, GameAction, GameState } from '../src/core/types';

let n = 0;
const ctx = (iso = '2026-11-26T08:00:00Z', seed = 1): EngineCtx => ({ now: new Date(iso), rng: mulberry32(seed), newId: () => `id${++n}` });
const read = (id: string, correct: number): GameAction => ({ type: 'SUBMIT_ARTICLE', articleId: id, correct, scrolledToBottom: true });
const run = (s: GameState, a: GameAction, c = ctx()) => dispatch(s, a, c);

describe('tiers & xp', () => {
  it('maps correct answers to tiers', () => {
    expect([0, 2, 3, 4, 5, 6].map(tierForCorrect)).toEqual(['normal', 'normal', 'rare', 'rare', 'precious', 'legendary']);
  });
  it('maps xp to levels at 100/250', () => {
    expect([0, 99, 100, 249, 250].map(levelForXp)).toEqual([1, 1, 2, 2, 3]);
  });
});

describe('reading → egg', () => {
  it('3 articles make 1 egg; tier from the batch total', () => {
    let s = createInitialState(ctx());
    let r = run(s, read('a1', 2)); s = r.state;
    r = run(s, read('a2', 2)); s = r.state;
    expect(s.eggs).toHaveLength(0);
    r = run(s, read('a3', 2));
    expect(r.state.eggs).toHaveLength(1);
    expect(r.state.eggs[0]!.tier).toBe('legendary');
    expect(r.state.pendingBatch).toHaveLength(0);
    expect(r.events.map((e) => e.type)).toContain('EGG_EARNED');
  });
  it('has no daily limit: 9 articles in one day give 3 eggs', () => {
    let s = createInitialState(ctx());
    for (let i = 0; i < 9; i++) s = run(s, read(`a${i}`, 0)).state;
    expect(s.eggs).toHaveLength(3);
    expect(todayReadCount(s, ctx().now)).toBe(9);
  });
  it('never double-counts an article', () => {
    const s = run(createInitialState(ctx()), read('a1', 1)).state;
    const r = run(s, read('a1', 2));
    expect(r.events).toEqual([{ type: 'REJECTED', reason: 'DUPLICATE_ARTICLE' }]);
    expect(r.state.reads).toHaveLength(1);
  });
  it('anti-cheat: must scroll to the end', () => {
    const s = createInitialState(ctx());
    expect(run(s, { ...read('a', 1), scrolledToBottom: false } as GameAction).events[0]).toEqual({ type: 'REJECTED', reason: 'NOT_SCROLLED' });
    expect(run(s, { ...read('a', 3) } as GameAction).events[0]).toEqual({ type: 'REJECTED', reason: 'BAD_INPUT' });
  });
});

function withEgg(tier: 'normal' | 'legendary' = 'normal'): GameState {
  let s = createInitialState(ctx());
  const corr = tier === 'legendary' ? 2 : 0;
  for (let i = 0; i < 3; i++) s = run(s, read(`x${i}`, corr)).state;
  return s;
}

describe('hatching', () => {
  it('starting xp by tier; legendary gives signature animal', () => {
    const s = withEgg('legendary');
    const r = run(s, { type: 'HATCH_EGG', eggId: s.eggs[0]!.id });
    const a = r.state.animals[0]!;
    expect(a.speciesId).toBe('deer');
    expect(a.xp).toBe(RULES.startXp.legendary);
    expect(a.level).toBe(2);
    expect(r.state.collection.deer!.maxLevel).toBe(2);
  });
  it('cannot hatch twice', () => {
    const s = withEgg();
    const s2 = run(s, { type: 'HATCH_EGG', eggId: s.eggs[0]!.id }).state;
    expect(run(s2, { type: 'HATCH_EGG', eggId: s.eggs[0]!.id }).events[0]).toEqual({ type: 'REJECTED', reason: 'NO_EGG' });
  });
  it('old species appear only after scene 1 and ~20% of normal eggs', () => {
    const rng = mulberry32(7);
    expect(Array.from({ length: 50 }, () => pickSpecies('normal', 'eden', rng)).every((x) => ['rabbit', 'sheep', 'deer', 'dove'].includes(x))).toBe(true);
    const picks = Array.from({ length: 2000 }, () => pickSpecies('normal', 'ark', rng));
    const old = picks.filter((x) => ['rabbit', 'sheep', 'deer', 'dove'].includes(x)).length / 2000;
    expect(old).toBeGreaterThan(0.15); expect(old).toBeLessThan(0.25);
    expect(pickSpecies('legendary', 'ark', rng)).toBe('elephant');
  });
});

describe('xp, level-up, capacity, unlock, golden', () => {
  const hatchOne = (s: GameState): GameState => {
    let t = s;
    for (let i = 0; i < 3; i++) t = run(t, read(`${t.reads.length}-${i}-${n++}`, 2)).state;
    const egg = t.eggs.find((e) => !e.hatched)!;
    return run(t, { type: 'HATCH_EGG', eggId: egg.id }).state;
  };
  it('reading fills the xp pool (10 per article + 10 per correct); animals level up only when spent', () => {
    let s = withEgg('legendary'); // 3 articles × 2 correct = 90 xp
    expect(s.xp).toBe(90);
    s = run(s, { type: 'HATCH_EGG', eggId: s.eggs[0]!.id }).state; // animal xp 100, lv2
    s = run(s, read('y1', 2)).state;
    expect(s.xp).toBe(120);
    expect(s.animals[0]!.xp).toBe(100);
    const id = s.animals[0]!.id;
    expect(run(s, { type: 'LEVEL_UP_ANIMAL', animalId: id }).events[0]).toEqual({ type: 'REJECTED', reason: 'NOT_ENOUGH_XP' }); // needs 150
    for (let i = 0; i < 2; i++) s = run(s, read(`z${i}`, 1)).state; // +40 → 160
    const r = run(s, { type: 'LEVEL_UP_ANIMAL', animalId: id });
    expect(r.events[0]).toEqual({ type: 'LEVEL_UP', animalId: id, level: 3 });
    expect(r.state.xp).toBe(10);
    expect(r.state.animals[0]).toMatchObject({ level: 3, xp: 250 });
    expect(r.state.collection.deer!.maxLevel).toBe(3);
    expect(run(r.state, { type: 'LEVEL_UP_ANIMAL', animalId: id }).events[0]).toEqual({ type: 'REJECTED', reason: 'MAX_LEVEL' });
  });
  it('names an animal, trimmed to 8 characters; empty clears it', () => {
    let s = createInitialState(ctx());
    s = { ...s, animals: [{ id: 'n1', createdAt: '', updatedAt: '', speciesId: 'rabbit', originSceneId: 'eden', xp: 0, level: 1 }] };
    s = run(s, { type: 'RENAME_ANIMAL', animalId: 'n1', name: '  小白兔兔兔兔兔兔兔  ' }).state;
    expect(s.animals[0]!.name).toBe('小白兔兔兔兔兔兔');
    s = run(s, { type: 'RENAME_ANIMAL', animalId: 'n1', name: ' ' }).state;
    expect(s.animals[0]).not.toHaveProperty('name');
    expect(run(s, { type: 'RENAME_ANIMAL', animalId: 'nope', name: 'x' }).events[0]).toEqual({ type: 'REJECTED', reason: 'BAD_INPUT' });
  });
  it('scene fills at capacity, unlocks the next, animals carry over', () => {
    let s = createInitialState(ctx());
    const types: string[] = [];
    for (let i = 0; i < 6; i++) {
      for (let k = 0; k < 3; k++) s = run(s, read(`q${i}${k}`, 2)).state;
      const r = run(s, { type: 'HATCH_EGG', eggId: s.eggs.find((e) => !e.hatched)!.id });
      s = r.state; types.push(...r.events.map((e) => e.type));
    }
    expect(types).toContain('SCENE_FULL');
    expect(types).toContain('SCENE_UNLOCKED');
    expect(s.currentSceneId).toBe('ark');
    expect(s.unlockedSceneIds).toEqual(['eden', 'ark']);
    expect(s.animals).toHaveLength(6);
    expect(s.animals.every((a) => a.originSceneId === 'eden')).toBe(true);
    // capacity counts carried-over animals: ark needs only 4 more
    for (let i = 0; i < 4; i++) s = hatchOne(s);
    expect(s.animals).toHaveLength(10);
    expect(s.currentSceneId).toBe('wilderness');
  });
  it('final scene full does not unlock anything', () => {
    let s = createInitialState(ctx());
    s = { ...s, currentSceneId: 'jerusalem', unlockedSceneIds: ['eden', 'ark', 'wilderness', 'bethlehem', 'galilee', 'jerusalem'] };
    const fake = Array.from({ length: 29 }, (_, i) => ({ id: `f${i}`, createdAt: '', updatedAt: '', speciesId: 'lion', originSceneId: 'jerusalem' as const, xp: 0, level: 1 as const }));
    s = { ...s, animals: fake };
    expect(hatchOne(s).currentSceneId).toBe('jerusalem');
  });
  it('golden variant unlocks when all scene species reach Lv3', () => {
    let s = createInitialState(ctx());
    const mk = (speciesId: string, i: number) => ({ id: `g${i}`, createdAt: '', updatedAt: '', speciesId, originSceneId: 'eden' as const, xp: 249, level: 2 as const });
    s = { ...s, animals: ['rabbit', 'sheep', 'deer', 'dove'].map(mk), xp: 4 };
    for (const id of ['g0', 'g1', 'g2']) s = run(s, { type: 'LEVEL_UP_ANIMAL', animalId: id }).state; // 1 xp each to Lv3
    expect(s.goldenScenes).toEqual([]);
    s = run(s, { type: 'LEVEL_UP_ANIMAL', animalId: 'g3' }).state;
    expect(s.goldenScenes).toEqual(['eden']);
  });
});

describe('05:00 Taipei reset', () => {
  it('rolls over at 21:00Z (05:00 +08)', () => {
    const before = new Date('2026-11-26T20:59:59Z'), after = new Date('2026-11-26T21:00:00Z');
    expect(gameDayStart(before)).not.toBe(gameDayStart(after));
    expect(new Date(gameDayStart(after)).toISOString()).toBe('2026-11-26T21:00:00.000Z');
  });
  it('today count resets but eggs/progress persist', () => {
    let s = createInitialState(ctx('2026-11-26T10:00:00Z'));
    for (let i = 0; i < 2; i++) s = run(s, read(`d${i}`, 1), ctx('2026-11-26T10:00:00Z')).state;
    expect(todayReadCount(s, new Date('2026-11-26T20:00:00Z'))).toBe(2);
    expect(todayReadCount(s, new Date('2026-11-26T21:30:00Z'))).toBe(0);
    expect(s.pendingBatch).toHaveLength(2);
  });
});

describe('schema migration', () => {
  it('upgrades v0 to v1 and keeps data', () => {
    const m = migrate({ version: 0, userId: 'u', reads: [], pendingBatch: [], eggs: [], animals: [], companions: [], currentSceneId: 'eden', unlockedSceneIds: ['eden'], lastResetAt: 'x' });
    expect(m.version).toBe(3);
    expect(m.goldenScenes).toEqual([]);
    expect(m.xp).toBe(0);
    expect('companions' in m).toBe(false);
  });
  it('turns old bronze serpents into ibexes, keeping level and xp', () => {
    const m = migrate({ version: 1, userId: 'u', reads: [], pendingBatch: [], eggs: [], companions: [], currentSceneId: 'wilderness', unlockedSceneIds: ['eden'], lastResetAt: 'x', goldenScenes: [], settings: { minReadSeconds: 90 },
      animals: [{ id: 'a', speciesId: 'bronzeSerpent', level: 2, xp: 120 }], collection: { bronzeSerpent: { id: 'c', speciesId: 'bronzeSerpent', maxLevel: 2, count: 1 } } });
    expect(m.version).toBe(3);
    expect(m.animals[0]).toMatchObject({ speciesId: 'ibex', level: 2, xp: 120 });
    expect(m.collection.ibex).toMatchObject({ speciesId: 'ibex', maxLevel: 2 });
    expect(m.collection.bronzeSerpent).toBeUndefined();
  });
  it('rejects newer versions', () => {
    expect(() => migrate({ version: 99 })).toThrow();
  });
});
