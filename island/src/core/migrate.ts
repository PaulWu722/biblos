import { RULES } from '../../config/rules';
import type { GameState } from './types';

type Raw = Record<string, unknown> & { version?: number };
/** migrations[n] upgrades a version-n blob to n+1. */
const migrations: Record<number, (s: Raw) => Raw> = {
  0: (s) => ({ ...s, version: 1, settings: { minReadSeconds: RULES.minReadSeconds, ...(s.settings as object | undefined) }, goldenScenes: s.goldenScenes ?? [], collection: s.collection ?? {} }),
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
