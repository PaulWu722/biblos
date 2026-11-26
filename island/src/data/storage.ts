import { RULES } from '../../config/rules';
import { createInitialState, defaultCtx } from '../core/engine';
import { migrate } from '../core/migrate';
import type { GameState } from '../core/types';
import { rpc } from './api';

export interface StorageAdapter {
  load(): Promise<GameState>;
  save(state: GameState): Promise<void>;
  exportJson(): Promise<string>;
  importJson(json: string): Promise<GameState>;
}

export class LocalStorageAdapter implements StorageAdapter {
  constructor(private store: Pick<Storage, 'getItem' | 'setItem'> = localStorage) {}
  async load(): Promise<GameState> {
    const raw = this.store.getItem(RULES.storageKey);
    if (!raw) { const s = createInitialState(defaultCtx()); await this.save(s); return s; }
    return migrate(JSON.parse(raw));
  }
  async save(state: GameState): Promise<void> { this.store.setItem(RULES.storageKey, JSON.stringify(state)); }
  async exportJson(): Promise<string> { return JSON.stringify(await this.load(), null, 2); }
  async importJson(json: string): Promise<GameState> {
    const s = migrate(JSON.parse(json)); // throws on bad/newer data, leaving storage untouched
    await this.save(s);
    return s;
  }
}

/** Cloud save: one GameState per signed-in user (table biblos_island, see supabase/island.sql). */
export class SupabaseAdapter implements StorageAdapter {
  constructor(private token: string) {}
  async load(): Promise<GameState> {
    const raw = await rpc<Record<string, unknown> | null>('biblos_island_load', { p_token: this.token });
    if (!raw) { const s = createInitialState(defaultCtx()); await this.save(s); return s; }
    return migrate(raw);
  }
  async save(state: GameState): Promise<void> { await rpc('biblos_island_save', { p_token: this.token, p_state: state }); }
  async exportJson(): Promise<string> { return JSON.stringify(await this.load(), null, 2); }
  async importJson(json: string): Promise<GameState> {
    const s = migrate(JSON.parse(json));
    await this.save(s);
    return s;
  }
}
