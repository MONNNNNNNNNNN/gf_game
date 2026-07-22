export interface ItemChoice {
  itemId: string;
  name: string;
  description: string;
  isUpgrade: boolean;
  nextLevel: number;
}

export type EventMap = {
  'score:update': { score: number };
  'combo:update': { combo: number };
  'board:stuck': undefined;
  'board:reshuffled': undefined;
  'game:restart': undefined;
  'settings:open': undefined;
  'settings:sound': { enabled: boolean };
  'settings:colorblind': { enabled: boolean };
  'highscore:beaten': { score: number };
  'run:timeUpdate': { remaining: number; max: number };
  'run:xpUpdate': { xp: number; level: number; xpToNext: number };
  'run:levelUp': { level: number; choices: ItemChoice[]; rerollAvailable: boolean };
  'run:resumed': undefined;
  'run:choiceMade': { itemId: string };
  'run:rerollRequested': undefined;
  'run:ended': { finalScore: number; level: number; durationSec: number };
};

type Listener<T> = (payload: T) => void;

class EventBus {
  private listeners = new Map<keyof EventMap, Set<Listener<any>>>();

  on<K extends keyof EventMap>(event: K, listener: Listener<EventMap[K]>): () => void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(listener);
    return () => this.off(event, listener);
  }

  off<K extends keyof EventMap>(event: K, listener: Listener<EventMap[K]>): void {
    this.listeners.get(event)?.delete(listener);
  }

  emit<K extends keyof EventMap>(event: K, payload: EventMap[K]): void {
    this.listeners.get(event)?.forEach((listener) => listener(payload));
  }
}

export const eventBus = new EventBus();
