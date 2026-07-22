import { Grid, randomTile } from './grid';
import { findMatches, type MatchResult } from './matchLogic';
import { detectSquares, classifySpecialSpawns, type SpecialSpawn } from './specialTiles';
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
  spawnedSpecials: SpecialSpawn[];
  fallMoves: FallMove[];
  spawned: SpawnedTile[];
}

export function resolveBoard(
  grid: Grid,
  swapTarget?: GridPos,
  bombThreshold = 5,
  rng: () => number = Math.random,
): CascadeStep[] {
  const steps: CascadeStep[] = [];
  let matches = findMatches(grid);
  let isFirstIteration = true;

  // do-while (not while): must run at least once even with zero initial matches, since this
  // is also used to resolve gravity/refill after a special-tile detonation clears cells that
  // don't necessarily form a "match" - those empty cells still need to fall/refill.
  do {
    const squareMatches = detectSquares(grid);
    const { spawns, plainClearPositions } = classifySpecialSpawns(
      matches,
      squareMatches,
      isFirstIteration ? swapTarget : undefined,
      bombThreshold,
    );

    for (const spawn of spawns) {
      grid.setSpecial(spawn.pos.row, spawn.pos.col, { kind: spawn.kind, baseTile: spawn.baseTile });
    }
    for (const pos of plainClearPositions) {
      grid.setEmpty(pos.row, pos.col);
    }

    const fallMoves = applyGravity(grid);
    const spawned = refill(grid, rng);
    steps.push({ matches, spawnedSpecials: spawns, fallMoves, spawned });

    isFirstIteration = false;
    matches = findMatches(grid);
  } while (matches.length > 0);

  return steps;
}

function applyGravity(grid: Grid): FallMove[] {
  const moves: FallMove[] = [];
  for (let col = 0; col < grid.width; col++) {
    let writeRow = grid.height - 1;
    for (let row = grid.height - 1; row >= 0; row--) {
      const tile = grid.get(row, col);
      if (tile !== null) {
        if (writeRow !== row) {
          grid.setCell(writeRow, col, tile);
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
