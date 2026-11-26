import { defaultCtx, dispatch } from '../core/engine';
import type { GameAction, GameEvent, GameState } from '../core/types';
import type { StorageAdapter } from '../data/storage';

type Listener = (state: GameState, events: GameEvent[]) => void;

/** UI action → dispatch → save → notify. The only place that changes game state. */
export class Store {
  private listeners: Listener[] = [];
  private saving: Promise<void> = Promise.resolve();
  constructor(public state: GameState, private adapter: StorageAdapter) {}

  subscribe(fn: Listener): void { this.listeners.push(fn); }

  async act(action: GameAction): Promise<GameEvent[]> {
    const { state, events } = dispatch(this.state, action, defaultCtx());
    if (state === this.state) return events; // rejected, nothing to save
    this.state = state;
    // Saves run one after another so an older state never lands after a newer one.
    // A failed save does not block later ones; each save writes the whole state, so the next one catches up.
    this.saving = this.saving.catch(() => {}).then(() => this.adapter.save(state));
    for (const fn of this.listeners) fn(state, events);
    await this.saving; // throws to the caller so the UI can say the save failed
    return events;
  }

  replace(state: GameState): void {
    this.state = state;
    for (const fn of this.listeners) fn(state, []);
  }
}
