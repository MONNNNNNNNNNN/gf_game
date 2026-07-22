import { eventBus } from '../../app/eventBus';
import type { CascadeStep } from '../cascade';
import type { ScoreEvent } from '../scoring';
import {
  MAX_ITEM_SLOTS,
  FILLER_CHOICE_ID,
  computeModifiers,
  defaultModifiers,
  pickItemChoices,
  applyChoiceToLoadout,
  type LoadoutSlot,
  type Modifiers,
} from '../items';

const BASE_TIME_MAX = 45;
const TIME_EXTEND_PER_TILE = 0.6;
const DECAY_RAMP_SECONDS = 90;
const FILLER_BONUS_SECONDS = 3;

function xpForLevel(level: number): number {
  return Math.round(20 * Math.pow(level, 1.35));
}

export class RunController {
  private elapsed = 0;
  private timeRemaining: number;
  private xp = 0;
  private level = 1;
  private paused = false;
  private ended = false;
  private loadout: LoadoutSlot[] = [];
  private modifiers: Modifiers = defaultModifiers();
  private pendingLevelUps = 0;
  private rerollUsedThisLevelUp = false;
  private pickHistory: string[] = [];
  private maxSlots: number;

  constructor(maxSlots: number = MAX_ITEM_SLOTS) {
    this.maxSlots = maxSlots;
    this.timeRemaining = this.timeMax();
  }

  private timeMax(): number {
    return BASE_TIME_MAX * (1 + this.modifiers.timeMaxBonus);
  }

  private timeCap(): number {
    return this.timeMax() * (1 + this.modifiers.overflowAllowance);
  }

  get isPaused(): boolean {
    return this.paused || this.ended;
  }

  hasEnded(): boolean {
    return this.ended;
  }

  getLevel(): number {
    return this.level;
  }

  getElapsed(): number {
    return this.elapsed;
  }

  getPickHistory(): string[] {
    return this.pickHistory;
  }

  getModifiers(): Modifiers {
    return this.modifiers;
  }

  tick(deltaSeconds: number): void {
    if (this.paused || this.ended) return;
    this.elapsed += deltaSeconds;
    const decayRate = (1 + this.elapsed / DECAY_RAMP_SECONDS) * this.modifiers.decayRateMultiplier;
    this.timeRemaining = Math.max(0, this.timeRemaining - deltaSeconds * decayRate);
    if (this.timeRemaining <= 0) {
      this.ended = true;
    }
    eventBus.emit('run:timeUpdate', { remaining: this.timeRemaining, max: this.timeMax() });
  }

  registerCascadeStep(step: CascadeStep, _scoreEvent: ScoreEvent): void {
    if (this.ended) return;
    const tilesCleared = step.matches.reduce((sum, m) => sum + m.positions.length, 0);

    const extension = tilesCleared * TIME_EXTEND_PER_TILE * this.modifiers.timeExtendMultiplier;
    this.timeRemaining = Math.min(this.timeCap(), this.timeRemaining + extension);
    if (this.modifiers.timeFloor > 0) {
      this.timeRemaining = Math.max(this.timeRemaining, this.modifiers.timeFloor);
    }

    this.xp += tilesCleared * this.modifiers.xpMultiplier;
    this.checkLevelUp();

    eventBus.emit('run:timeUpdate', { remaining: this.timeRemaining, max: this.timeMax() });
    eventBus.emit('run:xpUpdate', { xp: this.xp, level: this.level, xpToNext: xpForLevel(this.level) });
  }

  private checkLevelUp(): void {
    let needed = xpForLevel(this.level);
    while (this.xp >= needed) {
      this.xp -= needed;
      this.level += 1;
      this.pendingLevelUps += 1;
      needed = xpForLevel(this.level);
    }
    this.maybeTriggerLevelUp();
  }

  private maybeTriggerLevelUp(): void {
    if (this.pendingLevelUps > 0 && !this.paused) {
      this.paused = true;
      this.rerollUsedThisLevelUp = false;
      this.emitLevelUp();
    }
  }

  private emitLevelUp(): void {
    const choices = pickItemChoices(this.loadout, this.maxSlots);
    const rerollAvailable = this.modifiers.freeRerollCount > 0 && !this.rerollUsedThisLevelUp;
    eventBus.emit('run:levelUp', { level: this.level, choices, rerollAvailable });
  }

  rerollChoices(): void {
    if (this.pendingLevelUps <= 0 || this.rerollUsedThisLevelUp) return;
    if (this.modifiers.freeRerollCount <= 0) return;
    this.rerollUsedThisLevelUp = true;
    this.emitLevelUp();
  }

  applyItemChoice(itemId: string): void {
    if (this.pendingLevelUps <= 0) return;
    this.pendingLevelUps -= 1;
    this.pickHistory.push(itemId);

    if (itemId === FILLER_CHOICE_ID) {
      this.timeRemaining = Math.min(this.timeCap(), this.timeRemaining + FILLER_BONUS_SECONDS);
    } else {
      this.loadout = applyChoiceToLoadout(this.loadout, itemId, this.maxSlots);
      this.modifiers = computeModifiers(this.loadout);
    }

    this.paused = false;
    eventBus.emit('run:resumed', undefined);
    eventBus.emit('run:timeUpdate', { remaining: this.timeRemaining, max: this.timeMax() });
    this.maybeTriggerLevelUp();
  }
}
