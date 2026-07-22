import type { CascadeStep } from './cascade';

export interface ScoreEvent {
  points: number;
  combo: number;
}

export interface ScoreModifiers {
  scoreMultiplier?: number;
  cascadeStepBonus?: number;
  longMatchBonusMultiplier?: number;
}

const BASE_POINTS_PER_TILE = 10;

function matchBonusMultiplier(length: number): number {
  if (length >= 5) return 2.5;
  if (length === 4) return 1.5;
  return 1;
}

export class ComboTracker {
  private combo = 0;

  reset(soft = false): void {
    this.combo = soft ? Math.max(0, this.combo - 1) : 0;
  }

  scoreStep(step: CascadeStep, modifiers: ScoreModifiers = {}): ScoreEvent {
    this.combo += 1;
    let points = 0;
    for (const match of step.matches) {
      const length = match.positions.length;
      let bonus = matchBonusMultiplier(length);
      if (length >= 4 && modifiers.longMatchBonusMultiplier) {
        bonus *= 1 + modifiers.longMatchBonusMultiplier;
      }
      points += length * BASE_POINTS_PER_TILE * bonus;
    }
    if (this.combo > 1 && modifiers.cascadeStepBonus) {
      points += modifiers.cascadeStepBonus * (this.combo - 1);
    }
    points = Math.round(points * this.combo * (modifiers.scoreMultiplier ?? 1));
    return { points, combo: this.combo };
  }
}
