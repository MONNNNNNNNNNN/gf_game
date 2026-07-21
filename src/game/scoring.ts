import type { CascadeStep } from './cascade';

export interface ScoreEvent {
  points: number;
  combo: number;
}

const BASE_POINTS_PER_TILE = 10;

function matchBonusMultiplier(length: number): number {
  if (length >= 5) return 2.5;
  if (length === 4) return 1.5;
  return 1;
}

export class ComboTracker {
  private combo = 0;

  reset(): void {
    this.combo = 0;
  }

  scoreStep(step: CascadeStep): ScoreEvent {
    this.combo += 1;
    let points = 0;
    for (const match of step.matches) {
      points += match.positions.length * BASE_POINTS_PER_TILE * matchBonusMultiplier(match.positions.length);
    }
    points = Math.round(points * this.combo);
    return { points, combo: this.combo };
  }
}
