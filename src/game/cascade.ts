import { Grid, randomTile } from './grid';
import { findMatches, type MatchResult } from './matchLogic';
import type { GridPos } from '../lib/types';

export interface FallMove {
  from: GridPos;
  to: GridPos;
}

export interface SpawnedTile {
  pos: GridPos;
}

export interface CascadeStep {
  matches: MatchResult[];
  fallMoves: FallMove[];
  spawned: SpawnedTile[];
}

export function resolveBoard(grid: Grid, rng: () => number = Math.random): CascadeStep[] {
  const steps: CascadeStep[] = [];
  let matches = findMatches(grid);
  while (matches.length > 0) {
    clearMatches(grid, matches);
    const fallMoves = applyGravity(grid);
    const spawned = refill(grid, rng);
    steps.push({ matches, fallMoves, spawned });
    matches = findMatches(grid);
  }
  return steps;
}

function clearMatches(grid: Grid, matches: MatchResult[]): void {
  for (const match of matches) {
    for (const pos of match.positions) {
      grid.setEmpty(pos.row, pos.col);
    }
  }
}

function applyGravity(grid: Grid): FallMove[] {
  const moves: FallMove[] = [];
  for (let col = 0; col < grid.width; col++) {
    let writeRow = grid.height - 1;
    for (let row = grid.height - 1; row >= 0; row--) {
      const tile = grid.get(row, col);
      if (tile !== null) {
        if (writeRow !== row) {
          grid.set(writeRow, col, tile);
          grid.setEmpty(row, col);
          moves.push({ from: { row, col }, to: { row: writeRow, col } });
        }
        writeRow--;
      }
    }
  }
  return moves;
}

function refill(grid: Grid, rng: () => number): SpawnedTile[] {
  const spawned: SpawnedTile[] = [];
  for (let col = 0; col < grid.width; col++) {
    for (let row = 0; row < grid.height; row++) {
      if (grid.get(row, col) === null) {
        grid.set(row, col, randomTile(rng));
        spawned.push({ pos: { row, col } });
      }
    }
  }
  return spawned;
}
