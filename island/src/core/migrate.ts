import { RULES } from '../../config/rules';
import type { GameState } from './types';

type Raw = Record<string, unknown> & { version?: number };
/** migrations[n] upgrades a version-n blob to n+1. */
const migrations: Record<number, (s: Raw) => Raw> = {
  0: (s) => ({ ...s, version: 1, settings: { ...(s.settings as object | undefined) }, goldenScenes: s.goldenScenes ?? [], collection: s.collection ?? {} }),
  // The Sinai bronze serpent was replaced by the ibex: keep the animal, its level and xp.
  1: (s) => {
    const rename = (id: unknown) => (id === 'bronzeSerpent' ? 'ibex' : id);
    const animals = ((s.animals as Record<string, unknown>[] | undefined) ?? []).map((a) => ({ ...a, speciesId: rename(a.speciesId) }));
    const collection = { ...(s.collection as Record<string, Record<string, unknown>> | undefined) };
    if (collection.bronzeSerpent) { collection.ibex = { ...collection.bronzeSerpent, speciesId: 'ibex' }; delete collection.bronzeSerpent; }
    return { ...s, version: 2, animals, collection };
  },
  // Reading XP now goes to one pool spent in 圖鑑, instead of to up to 3 companions.
  2: ({ companions: _drop, ...s }) => ({ ...s, version: 3, xp: 0 }),
};

export function migrate(raw: Raw): GameState {
  let s = raw;
  let v = typeof s.version === 'number' ? s.version : 0;
  if (v > RULES.stateVersion) throw new Error(`state version ${v} is newer than supported ${RULES.stateVersion}`);
  while (v < RULES.stateVersion) {
    const step = migrations[v];
    if (!step) throw new Error(`no migration from version ${v}`);
    s = step(s);
    v = s.version as number;
  }
  return s as unknown as GameState;
}
